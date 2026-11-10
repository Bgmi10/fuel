import { NextRequest } from "next/server";

import { startBroadcastReplacing } from "@/src/lib/tv/broadcast-service";
import { handleError, ok, type IdParams } from "@/src/lib/tv/http";
import {
  publishBroadcastClear,
  publishBroadcastState,
} from "@/src/lib/tv/realtime";
import { getSocketServer } from "@/src/lib/socket-runtime";

/** "Start now": runs immediately, ignoring the scheduled time. */
export async function POST(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const { started, replaced } = await startBroadcastReplacing(id);
    const io = getSocketServer();

    // Old (looping) broadcasts leave first, then the new plan takes the TV.
    for (const old of replaced) {
      publishBroadcastClear(io, old, "STOPPED");
    }
    publishBroadcastState(io, started);

    return ok(started);
  } catch (error) {
    return handleError(error, "POST /api/workout-broadcasts/[id]/start");
  }
}