import { NextRequest } from "next/server";
import { z } from "zod";

import { handleError, ok, readBody, type IdParams } from "@/src/lib/tv/http";
import { addLayoutVideo } from "@/src/lib/tv/layout-service";
import { publishBroadcastState } from "@/src/lib/tv/realtime";
import { getSocketServer } from "@/src/lib/socket-runtime";

// nullish(): the admin may send null for "all TVs" / "append at the end".
const addVideoSchema = z.object({
  videoId: z.string().min(1),
  tvDeviceId: z.string().min(1).nullish(),
  position: z.number().int().min(0).nullish(),
  replaceExerciseId: z.string().min(1).nullish(),
});

/**
 * Add a library video to the grid, or replace a tile in place.
 * Body: { videoId, tvDeviceId?, position?, replaceExerciseId? }
 * With replaceExerciseId the new video takes that tile's exact position.
 */
export async function POST(req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const input = await readBody(req, addVideoSchema);

    const broadcast = await addLayoutVideo(id, {
      videoId: input.videoId,
      tvDeviceId: input.tvDeviceId ?? undefined,
      position: input.position ?? undefined,
      replaceExerciseId: input.replaceExerciseId ?? undefined,
    });

    publishBroadcastState(getSocketServer(), broadcast);
    return ok(broadcast);
  } catch (error) {
    return handleError(error, "POST /api/workout-broadcasts/[id]/layout/videos");
  }
}