import { NextRequest } from "next/server";

import { listLivePlans } from "@/src/lib/tv/broadcast-service";
import { liveQuerySchema } from "@/src/lib/tv/contracts";
import { handleError, ok, readQuery } from "@/src/lib/tv/http";

/** Admin Preview grid: every TV of the branch with its running plan (or null). */
export async function GET(req: NextRequest) {
  try {
    const { branchId } = readQuery(req, liveQuerySchema);
    return ok(await listLivePlans(branchId));
  } catch (error) {
    return handleError(error, "GET /api/workout-broadcasts/live");
  }
}