import { NextRequest } from "next/server";

import { videoSearchQuerySchema } from "@/src/lib/tv/contracts";
import { handleError, ok, readQuery } from "@/src/lib/tv/http";
import { searchVideos } from "@/src/lib/tv/layout-service";

/** ?q=squat&limit=20 : active library videos, name match, A-Z. */
export async function GET(req: NextRequest) {
  try {
    const { q, limit } = readQuery(req, videoSearchQuerySchema);
    return ok(await searchVideos(q, limit));
  } catch (error) {
    return handleError(error, "GET /api/workout-videos/search");
  }
}