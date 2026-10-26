import { NextRequest } from "next/server";

import { prisma } from "@/prisma";
import { videoPatchSchema } from "@/src/lib/tv/contracts-library";
import { HttpError } from "@/src/lib/tv/errors";
import { handleError, ok, readBody, type IdParams } from "@/src/lib/tv/http";

export async function GET(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const video = await prisma.workoutVideo.findUnique({
      where: { id },
      include: { _count: { select: { programItems: true } } },
    });

    if (!video) {
      throw new HttpError(404, "Workout video not found.");
    }

    return ok(video);
  } catch (error) {
    return handleError(error, "GET /api/workout-videos/[id]");
  }
}

/** Rename, replace thumbnail, enable or disable. Broadcast snapshots are unaffected. */
export async function PATCH(req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const input = await readBody(req, videoPatchSchema);

    const video = await prisma.workoutVideo.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.thumbnailUrl !== undefined
          ? { thumbnailUrl: input.thumbnailUrl || null }
          : {}),
      },
    });

    return ok(video);
  } catch (error) {
    return handleError(error, "PATCH /api/workout-videos/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;

    const video = await prisma.workoutVideo.findUnique({
      where: { id },
      select: { _count: { select: { programItems: true } } },
    });

    if (!video) {
      throw new HttpError(404, "Workout video not found.");
    }

    if (video._count.programItems > 0) {
      throw new HttpError(
        409,
        "This video is used in a workout program. Disable it instead of deleting it."
      );
    }

    await prisma.workoutVideo.delete({ where: { id } });

    return ok({ deleted: true });
  } catch (error) {
    return handleError(error, "DELETE /api/workout-videos/[id]");
  }
}
