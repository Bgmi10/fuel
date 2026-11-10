import { NextRequest } from "next/server";

import { layoutInputSchema } from "@/src/lib/tv/contracts";
import { handleError, ok, readBody, type IdParams } from "@/src/lib/tv/http";
import { reorderLayout } from "@/src/lib/tv/layout-service";
import { publishBroadcastState } from "@/src/lib/tv/realtime";
import { getSocketServer } from "@/src/lib/socket-runtime";

/**
 * Drag and drop. Body: { exerciseIds: string[], tvDeviceId?: string }
 * exerciseIds is the new grid order (index 0 = first tile).
 * Works while SCHEDULED, LIVE or PAUSED and reaches the TV instantly.
 */
export async function PATCH(req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const input = await readBody(req, layoutInputSchema);
    const broadcast = await reorderLayout(id, input);
    publishBroadcastState(getSocketServer(), broadcast);
    return ok(broadcast);
  } catch (error) {
    return handleError(error, "PATCH /api/workout-broadcasts/[id]/layout");
  }
}