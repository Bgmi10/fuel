/**
 * Everything the server pushes. Routes call these after the database
 * write succeeds. A missing socket server never fails the request: TVs
 * re-sync from GET /api/tv/state when they reconnect.
 *
 * Every layout edit (reorder / add / remove) goes through
 * publishBroadcastState with a bumped `version`. The run state in the plan
 * is unchanged, so TVs re-render tiles without restarting timers.
 */
import type { Server } from "socket.io";

import {
  buildTvPlans,
  shouldLoop,
  type FullBroadcast,
} from "./broadcast-service";
import { adminBranchRoom, tvRoom } from "./rooms";

type MaybeServer = Server | null | undefined;

function announceStatus(io: Server, broadcast: FullBroadcast) {
  io.to(adminBranchRoom(broadcast.branchId)).emit("broadcast:status", {
    broadcastId: broadcast.id,
    status: broadcast.status,
    version: broadcast.version,
  });
}

/**
 * Send each selected TV its own plan (start, pause, resume, finish,
 * layout change). Async so it can resolve the loop flag; callers may
 * fire-and-forget it exactly like before.
 */
export async function publishBroadcastState(
  io: MaybeServer,
  broadcast: FullBroadcast
): Promise<void> {
  if (!io) {
    console.warn("Socket server unavailable; TVs will re-sync on reconnect.");
    return;
  }

  try {
    const now = Date.now();
    const loop = await shouldLoop(broadcast);

    for (const [deviceId, plan] of buildTvPlans(broadcast, now, loop)) {
      io.to(tvRoom(deviceId)).emit("broadcast:state", plan);
    }
  } catch (error) {
    console.error("Unable to publish broadcast state:", error);
  }

  announceStatus(io, broadcast);
}

/** Tell TVs to leave the broadcast immediately (admin stop, or replaced by a schedule). */
export function publishBroadcastClear(
  io: MaybeServer,
  broadcast: FullBroadcast,
  reason: "STOPPED" | "DELETED" = "STOPPED"
) {
  if (!io) {
    console.warn("Socket server unavailable; TVs will re-sync on reconnect.");
    return;
  }

  for (const tv of broadcast.tvs) {
    io.to(tvRoom(tv.tvDeviceId)).emit("broadcast:clear", {
      broadcastId: broadcast.id,
      reason,
    });
  }

  announceStatus(io, broadcast);
}