import { NextRequest } from "next/server";

import { prisma } from "@/prisma";
import { scheduleInputSchema } from "@/src/lib/tv/contracts";
import { HttpError } from "@/src/lib/tv/errors";
import { handleError, ok, readBody, type IdParams } from "@/src/lib/tv/http";
import {
  assertActiveVideoIds,
  assertUsableProgram,
  toScheduleExerciseRows,
} from "@/src/lib/tv/library-service";

const include = {
  program: {
    select: { id: true, name: true, subtitle: true, description: true, intensity: true, isActive: true },
  },
  exercises: { orderBy: { sortOrder: "asc" }, include: { video: true } },
  _count: { select: { broadcasts: true } },
} as const;

export async function GET(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const schedule = await prisma.workoutSchedule.findUnique({ where: { id }, include });

    if (!schedule) {
      throw new HttpError(404, "Workout schedule not found.");
    }

    return ok(schedule);
  } catch (error) {
    return handleError(error, "GET /api/workout-schedules/[id]");
  }
}

/** Full replacement. Existing broadcasts keep their own snapshot. */
export async function PUT(req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const input = await readBody(req, scheduleInputSchema);

    await assertUsableProgram(input.programId);
    await assertActiveVideoIds(
      input.exercises.flatMap((e) => ("videoId" in e ? [e.videoId] : []))
    );

    const { exercises, nextSessionStartsAt, ...fields } = input;

    const schedule = await prisma.$transaction(async (tx) => {
      await tx.workoutSchedule.update({
        where: { id },
        data: {
          ...fields,
          nextSessionStartsAt: nextSessionStartsAt ? new Date(nextSessionStartsAt) : null,
        },
      });

      await tx.workoutScheduleExercise.deleteMany({ where: { scheduleId: id } });
      await tx.workoutScheduleExercise.createMany({
        data: toScheduleExerciseRows(exercises).map((row) => ({ scheduleId: id, ...row })),
      });

      return tx.workoutSchedule.findUniqueOrThrow({ where: { id }, include });
    });

    return ok(schedule);
  } catch (error) {
    return handleError(error, "PUT /api/workout-schedules/[id]");
  }
}

/** Safe even when broadcasts used it: their scheduleId becomes null. */
export async function DELETE(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    await prisma.workoutSchedule.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error, "DELETE /api/workout-schedules/[id]");
  }
}
