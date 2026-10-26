import { NextRequest } from "next/server";

import { prisma } from "@/prisma";
import { scheduleInputSchema, scheduleQuerySchema } from "@/src/lib/tv/contracts";
import { handleError, ok, readBody, readQuery } from "@/src/lib/tv/http";
import {
  assertActiveVideoIds,
  assertUsableProgram,
  toScheduleExerciseRows,
} from "@/src/lib/tv/library-service";

const scheduleInclude = {
  program: {
    select: { id: true, name: true, subtitle: true, description: true, intensity: true, isActive: true },
  },
  exercises: { orderBy: { sortOrder: "asc" }, include: { video: true } },
  _count: { select: { broadcasts: true } },
} as const;

export async function GET(req: NextRequest) {
  try {
    const { from, to } = readQuery(req, scheduleQuerySchema);

    const schedules = await prisma.workoutSchedule.findMany({
      where: { dateKey: { gte: from, lte: to } },
      orderBy: [{ dateKey: "asc" }, { createdAt: "asc" }],
      include: scheduleInclude,
    });

    return ok(schedules);
  } catch (error) {
    return handleError(error, "GET /api/workout-schedules");
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = await readBody(req, scheduleInputSchema);

    await assertUsableProgram(input.programId);
    await assertActiveVideoIds(
      input.exercises.flatMap((e) => ("videoId" in e ? [e.videoId] : []))
    );

    const { exercises, nextSessionStartsAt, ...fields } = input;

    const schedule = await prisma.workoutSchedule.create({
      data: {
        ...fields,
        nextSessionStartsAt: nextSessionStartsAt ? new Date(nextSessionStartsAt) : null,
        exercises: { create: toScheduleExerciseRows(exercises) },
      },
      include: scheduleInclude,
    });

    return ok(schedule, 201);
  } catch (error) {
    return handleError(error, "POST /api/workout-schedules");
  }
}
