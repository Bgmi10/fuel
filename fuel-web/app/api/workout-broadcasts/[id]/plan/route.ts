import { NextRequest } from "next/server";

import { previewPlan } from "@/src/lib/tv/broadcast-service";
import { handleError, ok, type IdParams } from "@/src/lib/tv/http";

/** The exact plan a TV would receive. Optional ?tvId= picks one TV. */
export async function GET(req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const tvId = new URL(req.url).searchParams.get("tvId") ?? undefined;
    return ok(await previewPlan(id, tvId));
  } catch (error) {
    return handleError(error, "GET /api/workout-broadcasts/[id]/plan");
  }
}
