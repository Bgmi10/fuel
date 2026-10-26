import { NextRequest } from "next/server";

import { startBroadcast } from "@/src/lib/tv/broadcast-service";
import { handleError, ok, type IdParams } from "@/src/lib/tv/http";
import { publishBroadcastState } from "@/src/lib/tv/realtime";
import { getSocketServer } from "@/src/lib/socket-runtime";

export async function POST(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const broadcast = await startBroadcast(id);
    publishBroadcastState(getSocketServer(), broadcast);
    return ok(broadcast);
  } catch (error) {
    return handleError(error, "POST /api/workout-broadcasts/[id]/start");
  }
}
