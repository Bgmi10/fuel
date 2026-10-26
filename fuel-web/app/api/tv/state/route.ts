import { NextRequest } from "next/server";

import { handleError, ok } from "@/src/lib/tv/http";
import { authenticateTvRequest, getTvState } from "@/src/lib/tv/tv-service";

/** Bearer device token. Returns the current plan (if any) and today's upcoming broadcasts. */
export async function GET(req: NextRequest) {
  try {
    const device = await authenticateTvRequest(req);
    return ok(await getTvState(device));
  } catch (error) {
    return handleError(error, "GET /api/tv/state");
  }
}
