import { NextRequest } from "next/server";

import { prisma } from "@/prisma";
import { programPatchSchema } from "@/src/lib/tv/contracts-library";
import { HttpError } from "@/src/lib/tv/errors";
import { handleError, ok, readBody, type IdParams } from "@/src/lib/tv/http";
import { assertActiveVideoIds } from "@/src/lib/tv/library-service";

const include = {
  items: { orderBy: { sortOrder: "asc" }, include: { video: true } },
  _count: { select: { schedules: true } },
} as const;

export async function GET(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const program = await prisma.workoutProgram.findUnique({ where: { id }, include });

    if (!program) {
      throw new HttpError(404, "Workout program not found.");
    }

    return ok(program);
  } catch (error) {
    return handleError(error, "GET /api/workout-programs/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const input = await readBody(req, programPatchSchema);

    if (input.videoIds) {
      await assertActiveVideoIds(input.videoIds);
    }

    const program = await prisma.$transaction(async (tx) => {
      await tx.workoutProgram.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.subtitle !== undefined ? { subtitle: input.subtitle || null } : {}),
          ...(input.description !== undefined
            ? { description: input.description || null }
            : {}),
          ...(input.intensity !== undefined ? { intensity: input.intensity } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });

      if (input.videoIds) {
        // unique(programId, sortOrder): delete first, then recreate in order.
        await tx.workoutProgramItem.deleteMany({ where: { programId: id } });
        await tx.workoutProgramItem.createMany({
          data: input.videoIds.map((videoId, sortOrder) => ({
            programId: id,
            videoId,
            sortOrder,
          })),
        });
      }

      return tx.workoutProgram.findUniqueOrThrow({ where: { id }, include });
    });

    return ok(program);
  } catch (error) {
    return handleError(error, "PATCH /api/workout-programs/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;

    const program = await prisma.workoutProgram.findUnique({
      where: { id },
      select: { _count: { select: { schedules: true } } },
    });

    if (!program) {
      throw new HttpError(404, "Workout program not found.");
    }

    if (program._count.schedules > 0) {
      throw new HttpError(
        409,
        "This program is used by existing schedules. Disable it instead of deleting it."
      );
    }

    await prisma.workoutProgram.delete({ where: { id } });

    return ok({ deleted: true });
  } catch (error) {
    return handleError(error, "DELETE /api/workout-programs/[id]");
  }
}
