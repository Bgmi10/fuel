/**
 * Broadcast lifecycle: create/update/delete, start/pause/resume/stop,
 * auto-completion, and per-TV plan building.
 *
 * DB only. Emitting to sockets lives in realtime.ts so routes can
 * decide what to publish after the transaction commits.
 *
 * Status machine:
 *   SCHEDULED --start--> LIVE <--pause/resume--> PAUSED
 *   LIVE|PAUSED --stop or timer end--> COMPLETED
 * Only SCHEDULED/DRAFT broadcasts are editable.
 */
import { Prisma } from "@prisma/client";

import { prisma } from "../../../prisma";
import type { BroadcastInput } from "./contracts";
import { HttpError } from "./errors";
import {
  buildPhases,
  buildPlan,
  elapsedMs,
  runStateFromRow,
  type BroadcastPlan,
  type PlanExercise,
} from "./plan";

export const broadcastInclude = {
  branch: { select: { id: true, name: true } },
  schedule: { select: { id: true, dateKey: true, programId: true } },
  exercises: { orderBy: { sortOrder: "asc" } },
  tvs: {
    include: {
      tvDevice: {
        select: { id: true, name: true, isOnline: true, lastSeenAt: true },
      },
      exercises: { orderBy: { sortOrder: "asc" } },
    },
  },
} satisfies Prisma.WorkoutBroadcastInclude;

export type FullBroadcast = Prisma.WorkoutBroadcastGetPayload<{
  include: typeof broadcastInclude;
}>;

type Db = Prisma.TransactionClient;

const EDITABLE = ["DRAFT", "SCHEDULED"] as const;
const RUNNING = ["LIVE", "PAUSED"] as const;

export async function loadBroadcast(
  id: string,
  client: Db = prisma
): Promise<FullBroadcast> {
  const broadcast = await client.workoutBroadcast.findUnique({
    where: { id },
    include: broadcastInclude,
  });

  if (!broadcast) {
    throw new HttpError(404, "Broadcast not found.");
  }

  return broadcast;
}

export function listBroadcasts(query: {
  branchId: string;
  from: string;
  to: string;
}) {
  return prisma.workoutBroadcast.findMany({
    where: {
      branchId: query.branchId,
      dateKey: { gte: query.from, lte: query.to },
    },
    orderBy: [{ dateKey: "asc" }, { createdAt: "asc" }],
    include: broadcastInclude,
  });
}

// ------------------------------------------------------------------
// Plans
// ------------------------------------------------------------------

type ExerciseRow = {
  sortOrder: number;
  exerciseName: string;
  videoId: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

function planExerciseFromRow(
  row: Pick<
    ExerciseRow,
    "exerciseName" | "videoUrl" | "thumbnailUrl" | "durationSeconds"
  >,
  id: string
): PlanExercise {
  return {
    id,
    name: row.exerciseName,
    videoUrl: row.videoUrl,
    thumbnailUrl: row.thumbnailUrl,
    durationSeconds: row.durationSeconds,
  };
}

/** One plan per selected TV, built from that TV's exercise selection. */
export function buildTvPlans(
  broadcast: FullBroadcast,
  now: number = Date.now()
): Map<string, BroadcastPlan> {
  const byId = new Map(broadcast.exercises.map((e) => [e.id, e]));
  const all = broadcast.exercises.map((e) => planExerciseFromRow(e, e.id));
  const plans = new Map<string, BroadcastPlan>();

  for (const tv of broadcast.tvs) {
    let exercises: PlanExercise[] = [];

    if (broadcast.mode === "SCHEDULE") {
      exercises =
        tv.exercises.length > 0
          ? tv.exercises.flatMap((mapping) => {
              const exercise = byId.get(mapping.exerciseId);
              return exercise ? [planExerciseFromRow(exercise, exercise.id)] : [];
            })
          : all;
    }

    plans.set(
      tv.tvDeviceId,
      buildPlan(
        {
          broadcastId: broadcast.id,
          version: broadcast.version,
          status: broadcast.status,
          mode: broadcast.mode,
          title: broadcast.title,
          subtitle: broadcast.subtitle,
          nextSessionStartsAt:
            broadcast.nextSessionStartsAt?.toISOString() ?? null,
          timers: broadcast,
          exercises,
          run: runStateFromRow(broadcast),
        },
        now
      )
    );
  }

  return plans;
}

/** Saved-broadcast plan for the admin Preview button. */
export async function previewPlan(
  id: string,
  tvDeviceId?: string
): Promise<BroadcastPlan> {
  const broadcast = await loadBroadcast(id);
  const now = Date.now();
  const plans = buildTvPlans(broadcast, now);

  if (tvDeviceId) {
    const plan = plans.get(tvDeviceId);
    if (!plan) {
      throw new HttpError(404, "That TV is not part of this broadcast.");
    }
    return plan;
  }

  const first = plans.values().next().value;
  if (first) {
    return first;
  }

  // No TVs selected yet: preview with every exercise.
  return buildPlan(
    {
      broadcastId: broadcast.id,
      version: broadcast.version,
      status: broadcast.status,
      mode: broadcast.mode,
      title: broadcast.title,
      subtitle: broadcast.subtitle,
      nextSessionStartsAt: broadcast.nextSessionStartsAt?.toISOString() ?? null,
      timers: broadcast,
      exercises:
        broadcast.mode === "SCHEDULE"
          ? broadcast.exercises.map((e) => planExerciseFromRow(e, e.id))
          : [],
      run: runStateFromRow(broadcast),
    },
    now
  );
}

// ------------------------------------------------------------------
// Create / update / delete
// ------------------------------------------------------------------

async function resolveExercises(
  items: BroadcastInput["exercises"]
): Promise<ExerciseRow[]> {
  const ids = [
    ...new Set(items.flatMap((item) => ("videoId" in item ? [item.videoId] : []))),
  ];

  const videos = ids.length
    ? await prisma.workoutVideo.findMany({
        where: { id: { in: ids }, isActive: true },
      })
    : [];

  const byId = new Map(videos.map((video) => [video.id, video]));

  if (ids.some((id) => !byId.has(id))) {
    throw new HttpError(
      400,
      "One or more selected library videos are missing or disabled."
    );
  }

  return items.map((item, sortOrder): ExerciseRow => {
    if ("videoId" in item) {
      const video = byId.get(item.videoId)!;
      return {
        sortOrder,
        exerciseName: video.name,
        videoId: video.id,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        durationSeconds: video.durationSeconds,
      };
    }

    return {
      sortOrder,
      exerciseName: item.exerciseName,
      videoId: null,
      videoUrl: null,
      thumbnailUrl: null,
      durationSeconds: null,
    };
  });
}

/** Validates everything and resolves the snapshot, before any write. */
async function prepare(input: BroadcastInput) {
  const branch = await prisma.branch.findUnique({
    where: { id: input.branchId },
    select: { id: true },
  });

  if (!branch) {
    throw new HttpError(404, "Branch not found.");
  }

  if (input.mode === "SCHEDULE") {
    if (!input.scheduleId) {
      throw new HttpError(400, "Select a workout schedule.");
    }

    const schedule = await prisma.workoutSchedule.findUnique({
      where: { id: input.scheduleId },
      select: { id: true },
    });

    if (!schedule) {
      throw new HttpError(404, "Workout schedule not found.");
    }
  }

  const tvIds = input.tvs.map((tv) => tv.tvDeviceId);

  if (tvIds.length > 0) {
    const devices = await prisma.tvDevice.findMany({
      where: { id: { in: tvIds }, branchId: input.branchId, revokedAt: null },
      select: { id: true },
    });

    if (devices.length !== tvIds.length) {
      throw new HttpError(
        400,
        "One or more selected TVs do not belong to this branch."
      );
    }
  }

  const exercises =
    input.mode === "SCHEDULE" ? await resolveExercises(input.exercises) : [];

  const tvRows = input.tvs.map((tv) => ({
    tvDeviceId: tv.tvDeviceId,
    orders:
      input.mode === "SCHEDULE"
        ? tv.exerciseSortOrders ?? exercises.map((e) => e.sortOrder)
        : [],
  }));

  // Reject unplayable setups now (throws PlanError -> 400).
  const lists = tvRows.length
    ? tvRows.map((tv) => tv.orders)
    : [exercises.map((e) => e.sortOrder)];

  for (const orders of lists) {
    buildPhases(
      input,
      orders.map((order) => planExerciseFromRow(exercises[order], String(order)))
    );
  }

  return { exercises, tvRows };
}

function baseData(input: BroadcastInput) {
  return {
    dateKey: input.dateKey,
    mode: input.mode,
    scheduleId: input.mode === "SCHEDULE" ? input.scheduleId ?? null : null,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    intensity: input.intensity,
    demonstrationSeconds: input.demonstrationSeconds,
    warmupSeconds: input.warmupSeconds,
    prepareSeconds: input.prepareSeconds,
    workSeconds: input.workSeconds,
    restSeconds: input.restSeconds,
    sets: input.sets,
    cycles: input.cycles,
    restBetweenCycleSeconds: input.restBetweenCycleSeconds,
    coolDownSeconds: input.coolDownSeconds,
    nextSessionStartsAt: input.nextSessionStartsAt
      ? new Date(input.nextSessionStartsAt)
      : null,
  };
}

async function writeChildren(
  tx: Db,
  broadcastId: string,
  prepared: Awaited<ReturnType<typeof prepare>>
) {
  if (prepared.exercises.length > 0) {
    await tx.workoutBroadcastExercise.createMany({
      data: prepared.exercises.map((row) => ({ broadcastId, ...row })),
    });
  }

  const saved = await tx.workoutBroadcastExercise.findMany({
    where: { broadcastId },
    select: { id: true, sortOrder: true },
  });
  const idByOrder = new Map(saved.map((e) => [e.sortOrder, e.id]));

  for (const tv of prepared.tvRows) {
    await tx.workoutBroadcastTV.create({
      data: {
        broadcastId,
        tvDeviceId: tv.tvDeviceId,
        exercises:
          tv.orders.length > 0
            ? {
                create: tv.orders.map((order, index) => ({
                  exerciseId: idByOrder.get(order)!,
                  sortOrder: index,
                })),
              }
            : undefined,
      },
    });
  }
}

export async function createBroadcast(
  input: BroadcastInput
): Promise<FullBroadcast> {
  const prepared = await prepare(input);

  const id = await prisma.$transaction(async (tx) => {
    const created = await tx.workoutBroadcast.create({
      data: {
        branchId: input.branchId,
        status: "SCHEDULED",
        ...baseData(input),
      },
      select: { id: true },
    });

    await writeChildren(tx, created.id, prepared);

    return created.id;
  });

  return loadBroadcast(id);
}

export async function updateBroadcast(
  id: string,
  input: BroadcastInput
): Promise<FullBroadcast> {
  const existing = await prisma.workoutBroadcast.findUnique({
    where: { id },
    select: { status: true, branchId: true },
  });

  if (!existing) {
    throw new HttpError(404, "Broadcast not found.");
  }

  if (!EDITABLE.includes(existing.status as (typeof EDITABLE)[number])) {
    throw new HttpError(
      409,
      "A live, finished or cancelled broadcast cannot be edited."
    );
  }

  if (existing.branchId !== input.branchId) {
    throw new HttpError(400, "A broadcast cannot move to another branch.");
  }

  const prepared = await prepare(input);

  await prisma.$transaction(async (tx) => {
    // Guard against a start that landed between the check and now.
    const claimed = await tx.workoutBroadcast.updateMany({
      where: { id, status: { in: [...EDITABLE] } },
      data: { ...baseData(input), version: { increment: 1 } },
    });

    if (claimed.count === 0) {
      throw new HttpError(409, "This broadcast just changed. Reload and retry.");
    }

    // Replace-all: exercises cascade to TV mappings, TVs cascade too.
    await tx.workoutBroadcastTV.deleteMany({ where: { broadcastId: id } });
    await tx.workoutBroadcastExercise.deleteMany({ where: { broadcastId: id } });

    await writeChildren(tx, id, prepared);
  });

  return loadBroadcast(id);
}

export async function deleteBroadcast(id: string): Promise<void> {
  const existing = await prisma.workoutBroadcast.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!existing) {
    throw new HttpError(404, "Broadcast not found.");
  }

  if (RUNNING.includes(existing.status as (typeof RUNNING)[number])) {
    throw new HttpError(409, "Stop the broadcast before deleting it.");
  }

  await prisma.workoutBroadcast.delete({ where: { id } });
}

// ------------------------------------------------------------------
// Control
// ------------------------------------------------------------------

export async function startBroadcast(id: string): Promise<FullBroadcast> {
  const broadcast = await loadBroadcast(id);

  if (!EDITABLE.includes(broadcast.status as (typeof EDITABLE)[number])) {
    throw new HttpError(409, `This broadcast is ${broadcast.status.toLowerCase()} and cannot be started.`);
  }

  if (broadcast.tvs.length === 0) {
    throw new HttpError(400, "Select at least one TV before starting.");
  }

  buildTvPlans(broadcast); // throws PlanError if unplayable

  const busy = await prisma.workoutBroadcastTV.findFirst({
    where: {
      tvDeviceId: { in: broadcast.tvs.map((tv) => tv.tvDeviceId) },
      broadcastId: { not: id },
      broadcast: { status: { in: [...RUNNING] } },
    },
    include: { tvDevice: { select: { name: true } } },
  });

  if (busy) {
    throw new HttpError(
      409,
      `${busy.tvDevice.name} is already running another broadcast.`
    );
  }

  const result = await prisma.workoutBroadcast.updateMany({
    where: { id, status: { in: [...EDITABLE] } },
    data: {
      status: "LIVE",
      startedAt: new Date(),
      pausedAt: null,
      pausedTotalMs: 0,
      endedAt: null,
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    throw new HttpError(409, "This broadcast just changed. Reload and retry.");
  }

  return loadBroadcast(id);
}

export async function pauseBroadcast(id: string): Promise<FullBroadcast> {
  const result = await prisma.workoutBroadcast.updateMany({
    where: { id, status: "LIVE" },
    data: { status: "PAUSED", pausedAt: new Date(), version: { increment: 1 } },
  });

  if (result.count === 0) {
    throw new HttpError(409, "Only a live broadcast can be paused.");
  }

  return loadBroadcast(id);
}

export async function resumeBroadcast(id: string): Promise<FullBroadcast> {
  const existing = await loadBroadcast(id);

  if (existing.status !== "PAUSED" || !existing.pausedAt) {
    throw new HttpError(409, "Only a paused broadcast can be resumed.");
  }

  const pausedFor = Math.max(0, Date.now() - existing.pausedAt.getTime());

  const result = await prisma.workoutBroadcast.updateMany({
    where: { id, status: "PAUSED" },
    data: {
      status: "LIVE",
      pausedAt: null,
      pausedTotalMs: existing.pausedTotalMs + pausedFor,
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    throw new HttpError(409, "This broadcast just changed. Reload and retry.");
  }

  return loadBroadcast(id);
}

export async function stopBroadcast(id: string): Promise<FullBroadcast> {
  const result = await prisma.workoutBroadcast.updateMany({
    where: { id, status: { in: [...RUNNING] } },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    throw new HttpError(409, "This broadcast is not running.");
  }

  return loadBroadcast(id);
}

/**
 * Called by the server every few seconds. A broadcast is finished when
 * the slowest TV's plan has run to its end.
 */
export async function completeFinishedBroadcasts(
  now: number = Date.now()
): Promise<FullBroadcast[]> {
  const live = await prisma.workoutBroadcast.findMany({
    where: { status: "LIVE" },
    include: broadcastInclude,
  });

  const finished: FullBroadcast[] = [];

  for (const broadcast of live) {
    let longest = 0;

    try {
      for (const plan of buildTvPlans(broadcast, now).values()) {
        longest = Math.max(longest, plan.totalMs);
      }
    } catch {
      continue; // unplayable data: leave it for an admin to stop
    }

    const elapsed = elapsedMs(runStateFromRow(broadcast), now);

    if (longest > 0 && elapsed !== null && elapsed >= longest) {
      const result = await prisma.workoutBroadcast.updateMany({
        where: { id: broadcast.id, status: "LIVE" },
        data: {
          status: "COMPLETED",
          endedAt: new Date(now),
          version: { increment: 1 },
        },
      });

      if (result.count > 0) {
        finished.push(await loadBroadcast(broadcast.id));
      }
    }
  }

  return finished;
}
