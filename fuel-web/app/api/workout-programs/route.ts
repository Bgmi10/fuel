import { NextRequest } from "next/server";

import { prisma } from "@/prisma";
import { programCreateSchema } from "@/src/lib/tv/contracts-library";
import { handleError, ok, readBody } from "@/src/lib/tv/http";
import { assertActiveVideoIds } from "@/src/lib/tv/library-service";

const programInclude = {
  items: { orderBy: { sortOrder: "asc" }, include: { video: true } },
  _count: { select: { schedules: true } },
} as const;

export async function GET() {
  try {
    const programs = await prisma.workoutProgram.findMany({
      orderBy: { createdAt: "desc" },
      include: programInclude,
    });

    return ok(programs);
  } catch (error) {
    return handleError(error, "GET /api/workout-programs");
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = await readBody(req, programCreateSchema);
    await assertActiveVideoIds(input.videoIds);

    const program = await prisma.workoutProgram.create({
      data: {
        name: input.name,
        subtitle: input.subtitle,
        description: input.description,
        intensity: input.intensity,
        items: {
          create: input.videoIds.map((videoId, sortOrder) => ({ videoId, sortOrder })),
        },
      },
      include: programInclude,
    });

    return ok(program, 201);
  } catch (error) {
    return handleError(error, "POST /api/workout-programs");
  }
}
