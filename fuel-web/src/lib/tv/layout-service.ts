/**
 * Live layout editing: reorder, add and remove the videos on a broadcast's
 * TV grid while it is SCHEDULED, LIVE or PAUSED.
 *
 * Grid position = WorkoutBroadcastTVExercise.sortOrder (0 = first tile).
 * Every operation runs in ONE transaction, bumps `version`, and the route
 * then calls publishBroadcastState(). The timeline is shared, so none of
 * this can restart a timer.
 *
 * Scope: pass tvDeviceId to edit one TV, or omit it to apply to every TV
 * of the broadcast.
 */
import type { Prisma } from "@prisma/client";

import { prisma } from "../../../prisma";
import { loadBroadcast, type FullBroadcast } from "./broadcast-service";
import { HttpError } from "./errors";

type Db = Prisma.TransactionClient;

export const MAX_GRID_VIDEOS = 8;

const LAYOUT_EDITABLE = ["SCHEDULED", "LIVE", "PAUSED"] as const;

interface LayoutContext {
  broadcast: FullBroadcast;
  /** WorkoutBroadcastTV.id -> exercise ids in grid order. Mutate to change. */
  lists: Map<string, string[]>;
}

function pickTargets(broadcast: FullBroadcast, tvDeviceId?: string) {
  if (!tvDeviceId) {
    return broadcast.tvs;
  }

  const tv = broadcast.tvs.find((candidate) => candidate.tvDeviceId === tvDeviceId);

  if (!tv) {
    throw new HttpError(404, "That TV is not part of this broadcast.");
  }

  return [tv];
}

async function editLayout(
  id: string,
  mutate: (context: LayoutContext, tx: Db) => Promise<void>
): Promise<FullBroadcast> {
  await prisma.$transaction(async (tx) => {
    const broadcast = await loadBroadcast(id, tx);

    if (
      !LAYOUT_EDITABLE.includes(
        broadcast.status as (typeof LAYOUT_EDITABLE)[number]
      )
    ) {
      throw new HttpError(409, "A finished or cancelled broadcast cannot be edited.");
    }

    if (broadcast.mode !== "SCHEDULE") {
      throw new HttpError(400, "Timer-only broadcasts have no videos.");
    }

    if (broadcast.tvs.length === 0) {
      throw new HttpError(400, "Select a TV before editing the layout.");
    }

    // Claim first: serialises concurrent edits and bumps the version.
    const claimed = await tx.workoutBroadcast.updateMany({
      where: { id, status: { in: [...LAYOUT_EDITABLE] } },
      data: { version: { increment: 1 } },
    });

    if (claimed.count === 0) {
      throw new HttpError(409, "This broadcast just changed. Reload and retry.");
    }

    // A TV with no explicit list plays every exercise: make that explicit.
    const allIds = broadcast.exercises.map((exercise) => exercise.id);
    const original = new Map<string, string[]>();

    for (const tv of broadcast.tvs) {
      original.set(
        tv.id,
        tv.exercises.length > 0
          ? tv.exercises.map((mapping) => mapping.exerciseId)
          : [...allIds]
      );
    }

    const lists = new Map<string, string[]>(
      [...original].map(([key, value]) => [key, [...value]])
    );

    await mutate({ broadcast, lists }, tx);

    for (const tv of broadcast.tvs) {
      const next = lists.get(tv.id)!;

      if (next.length < 1) {
        throw new HttpError(400, "Each TV needs at least one video.");
      }

      if (next.length > MAX_GRID_VIDEOS) {
        throw new HttpError(
          400,
          `A TV can show at most ${MAX_GRID_VIDEOS} videos.`
        );
      }

      const changed =
        tv.exercises.length === 0 || next.join("|") !== original.get(tv.id)!.join("|");

      if (!changed) {
        continue;
      }

      await tx.workoutBroadcastTVExercise.deleteMany({
        where: { broadcastTVId: tv.id },
      });
      await tx.workoutBroadcastTVExercise.createMany({
        data: next.map((exerciseId, sortOrder) => ({
          broadcastTVId: tv.id,
          exerciseId,
          sortOrder,
        })),
      });
    }

    // Snapshot rows that no TV plays any more.
    await tx.workoutBroadcastExercise.deleteMany({
      where: { broadcastId: id, tvExercises: { none: {} } },
    });
  });

  return loadBroadcast(id);
}

/** Drag and drop: set the exact grid order (also used to drop tiles). */
export function reorderLayout(
  id: string,
  input: { tvDeviceId?: string; exerciseIds: string[] }
): Promise<FullBroadcast> {
  return editLayout(id, async ({ broadcast, lists }) => {
    const known = new Set(broadcast.exercises.map((exercise) => exercise.id));

    if (input.exerciseIds.some((exerciseId) => !known.has(exerciseId))) {
      throw new HttpError(400, "One or more videos are not part of this broadcast.");
    }

    for (const tv of pickTargets(broadcast, input.tvDeviceId)) {
      lists.set(tv.id, [...input.exerciseIds]);
    }
  });
}

/**
 * Add a library video (from search). With replaceExerciseId the new video
 * takes that tile's exact position, so "delete tile 3, add another" is one
 * live change instead of two.
 */
export function addLayoutVideo(
  id: string,
  input: {
    videoId: string;
    tvDeviceId?: string;
    position?: number;
    replaceExerciseId?: string;
  }
): Promise<FullBroadcast> {
  return editLayout(id, async ({ broadcast, lists }, tx) => {
    const video = await tx.workoutVideo.findFirst({
      where: { id: input.videoId, isActive: true },
    });

    if (!video) {
      throw new HttpError(400, "That video is missing or disabled.");
    }

    const targets = pickTargets(broadcast, input.tvDeviceId);

    const last = await tx.workoutBroadcastExercise.aggregate({
      where: { broadcastId: broadcast.id },
      _max: { sortOrder: true },
    });

    const created = await tx.workoutBroadcastExercise.create({
      data: {
        broadcastId: broadcast.id,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        exerciseName: video.name,
        videoId: video.id,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        durationSeconds: video.durationSeconds,
      },
    });

    let applied = 0;

    for (const tv of targets) {
      const list = lists.get(tv.id)!;

      if (input.replaceExerciseId) {
        const index = list.indexOf(input.replaceExerciseId);

        if (index === -1) {
          if (input.tvDeviceId) {
            throw new HttpError(400, "The video to replace is not on this TV.");
          }
          continue; // "all TVs" edit: skip TVs that do not show it
        }

        list[index] = created.id;
        applied += 1;
        continue;
      }

      if (list.length >= MAX_GRID_VIDEOS) {
        throw new HttpError(
          400,
          `A TV can show at most ${MAX_GRID_VIDEOS} videos.`
        );
      }

      const position = Math.min(
        Math.max(input.position ?? list.length, 0),
        list.length
      );
      list.splice(position, 0, created.id);
      applied += 1;
    }

    if (applied === 0) {
      throw new HttpError(400, "Nothing to change.");
    }
  });
}

/** Remove a tile. A TV can never be left with zero videos. */
export function removeLayoutVideo(
  id: string,
  exerciseId: string,
  tvDeviceId?: string
): Promise<FullBroadcast> {
  return editLayout(id, async ({ broadcast, lists }) => {
    let removed = 0;

    for (const tv of pickTargets(broadcast, tvDeviceId)) {
      const list = lists.get(tv.id)!;
      const index = list.indexOf(exerciseId);

      if (index === -1) {
        continue;
      }

      if (list.length === 1) {
        throw new HttpError(400, "Each TV needs at least one video.");
      }

      list.splice(index, 1);
      removed += 1;
    }

    if (removed === 0) {
      throw new HttpError(404, "That video is not on this layout.");
    }
  });
}

// ------------------------------------------------------------------
// Library search (for "search and add video")
// ------------------------------------------------------------------

export function searchVideos(q: string, limit: number) {
  return prisma.workoutVideo.findMany({
    where: {
      isActive: true,
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true,
      name: true,
      thumbnailUrl: true,
      videoUrl: true,
      durationSeconds: true,
    },
  });
}