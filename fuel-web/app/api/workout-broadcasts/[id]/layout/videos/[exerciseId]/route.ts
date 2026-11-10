import { NextRequest } from "next/server";

import { handleError, ok } from "@/src/lib/tv/http";
import { removeLayoutVideo } from "@/src/lib/tv/layout-service";
import { publishBroadcastState } from "@/src/lib/tv/realtime";
import { getSocketServer } from "@/src/lib/socket-runtime";

type Params = { params: Promise<{ id: string; exerciseId: string }> };

/**
 * Remove a tile. Optional ?tvDeviceId= limits it to one TV.
 * A TV can never be left with zero videos.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id, exerciseId } = await params;
    const tvDeviceId = new URL(req.url).searchParams.get("tvDeviceId") || undefined;

    const broadcast = await removeLayoutVideo(id, exerciseId, tvDeviceId);

    publishBroadcastState(getSocketServer(), broadcast);
    return ok(broadcast);
  } catch (error) {
    return handleError(error, "DELETE /api/workout-broadcasts/[id]/layout/videos/[exerciseId]");
  }
}