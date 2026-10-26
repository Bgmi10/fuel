import { NextRequest } from "next/server";

import { prisma } from "@/prisma";
import { videoCreateSchema, videoQuerySchema } from "@/src/lib/tv/contracts-library";
import { handleError, ok, readBody, readQuery } from "@/src/lib/tv/http";

export async function GET(req: NextRequest) {
  try {
    const query = readQuery(req, videoQuerySchema);

    const videos = await prisma.workoutVideo.findMany({
      where: {
        ...(query.active ? { isActive: query.active === "true" } : {}),
        ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      include: { _count: { select: { programItems: true } } },
    });

    return ok(videos);
  } catch (error) {
    return handleError(error, "GET /api/workout-videos");
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = await readBody(req, videoCreateSchema);
    const video = await prisma.workoutVideo.create({ data: input });
    return ok(video, 201);
  } catch (error) {
    return handleError(error, "POST /api/workout-videos");
  }
}
