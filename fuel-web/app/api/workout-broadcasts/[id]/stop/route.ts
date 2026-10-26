import { NextRequest } from "next/server";

import { stopBroadcast } from "@/src/lib/tv/broadcast-service";
import { handleError, ok, type IdParams } from "@/src/lib/tv/http";
import { publishBroadcastClear } from "@/src/lib/tv/realtime";
import { getSocketServer } from "@/src/lib/socket-runtime";

export async function POST(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const broadcast = await stopBroadcast(id);
    publishBroadcastClear(getSocketServer(), broadcast, "STOPPED");
    return ok(broadcast);
  } catch (error) {
    return handleError(error, "POST /api/workout-broadcasts/[id]/stop");
  }
}
