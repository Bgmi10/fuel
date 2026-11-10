import { NextRequest } from "next/server";

import {
  addExerciseInputSchema,
  removeExerciseQuerySchema,
} from "@/src/lib/tv/contracts";
import {
  handleError,
  ok,
  readBody,
  readQuery,
  type IdParams,
} from "@/src/lib/tv/http";
import { addLayoutVideo, removeLayoutVideo } from "@/src/lib/tv/layout-service";
import { publishBroadcastState } from "@/src/lib/tv/realtime";
import { getSocketServer } from "@/src/lib/socket-runtime";

/**
 * Add a library video (picked from search).
 * Body: { videoId, tvDeviceId?, position?, replaceExerciseId? }
 * replaceExerciseId swaps a tile in place in one live change.
 */
export async function POST(req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const input = await readBody(req, addExerciseInputSchema);
    const broadcast = await addLayoutVideo(id, input);
    publishBroadcastState(getSocketServer(), broadcast);
    return ok(broadcast, 201);
  } catch (error) {
    return handleError(error, "POST /api/workout-broadcasts/[id]/exercises");
  }
}

/** Remove a tile. Query: ?exerciseId=...&tvDeviceId=... (tvDeviceId optional) */
export async function DELETE(req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const { exerciseId, tvDeviceId } = readQuery(req, removeExerciseQuerySchema);
    const broadcast = await removeLayoutVideo(id, exerciseId, tvDeviceId);
    publishBroadcastState(getSocketServer(), broadcast);
    return ok(broadcast);
  } catch (error) {
    return handleError(error, "DELETE /api/workout-broadcasts/[id]/exercises");
  }
}