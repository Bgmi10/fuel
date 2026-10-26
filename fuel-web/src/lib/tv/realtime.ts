/**
 * Everything the server pushes. Routes call these after the database
 * write succeeds. A missing socket server never fails the request: TVs
 * re-sync from GET /api/tv/state when they reconnect.
 */
import type { Server } from "socket.io";

import { buildTvPlans, type FullBroadcast } from "./broadcast-service";
import { adminBranchRoom, tvRoom } from "./rooms";

type MaybeServer = Server | null | undefined;

function announceStatus(io: Server, broadcast: FullBroadcast) {
  io.to(adminBranchRoom(broadcast.branchId)).emit("broadcast:status", {
    broadcastId: broadcast.id,
    status: broadcast.status,
    version: broadcast.version,
  });
}

/** Send each selected TV its own plan (start, pause, resume, finish). */
export function publishBroadcastState(io: MaybeServer, broadcast: FullBroadcast) {
  if (!io) {
    console.warn("Socket server unavailable; TVs will re-sync on reconnect.");
    return;
  }

  try {
    const now = Date.now();
    for (const [deviceId, plan] of buildTvPlans(broadcast, now)) {
      io.to(tvRoom(deviceId)).emit("broadcast:state", plan);
    }
  } catch (error) {
    console.error("Unable to publish broadcast state:", error);
  }

  announceStatus(io, broadcast);
}

/** Tell TVs to leave the broadcast immediately (admin stop). */
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
