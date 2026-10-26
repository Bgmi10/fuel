import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

import { setSocketServer } from "./src/lib/socket-runtime";
import { prisma } from "./prisma";
import { completeFinishedBroadcasts } from "./src/lib/tv/broadcast-service";
import { publishBroadcastState } from "./src/lib/tv/realtime";
import { adminBranchRoom, pairingRoom, tvRoom } from "./src/lib/tv/rooms";
import { verifyAdminSocketToken } from "./src/lib/tv/security";
import {
  cleanupPairingSessions,
  findDeviceByToken,
  getTvState,
} from "./src/lib/tv/tv-service";

/**
 * Realtime contract
 *
 * TV  -> server
 *   tv:pairing:join   { pairingCode }                    ack { success }
 *   tv:authenticate   { deviceToken }                    ack { success, data: TvState }
 *   tv:status         { broadcastId, phaseIndex, state, message? }
 *
 * server -> TV   (room tv:{deviceId})
 *   tv:paired         { deviceId, deviceToken, ... }     (pairing room only)
 *   broadcast:state   BroadcastPlan   start / pause / resume / finish
 *   broadcast:clear   { broadcastId, reason }            admin stop
 *   tv:revoked        { deviceId }
 *
 * Admin browser -> server
 *   admin:subscribe   { token, branchId }                ack { success, data }
 *   Admin sockets can only listen. Every command is a REST call.
 *
 * server -> admin   (room admin:branch:{branchId})
 *   tv:device-status  { deviceId, isOnline, lastSeenAt }
 *   tv:status         { deviceId, broadcastId, phaseIndex, state, message?, at }
 *   broadcast:status  { broadcastId, status, version }
 */

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const SWEEP_INTERVAL_MS = 5_000;
const OFFLINE_GRACE_MS = 1_500;

type TvStatusPayload = {
  deviceId: string;
  broadcastId: string | null;
  phaseIndex: number | null;
  state: string;
  message: string | null;
  at: string;
};

/** Last status per TV, so a newly opened admin page can show it immediately. */
const latestTvStatus = new Map<string, TvStatusPayload>();

const nextApp = next({ dev, hostname, port });
const requestHandler = nextApp.getRequestHandler();

function isTvConnected(io: Server, deviceId: string) {
  return Boolean(io.sockets.adapter.rooms.get(tvRoom(deviceId))?.size);
}

function connectedTvIds(io: Server): Set<string> {
  const ids = new Set<string>();

  for (const [room, sockets] of io.sockets.adapter.rooms) {
    if (room.startsWith("tv:") && sockets.size > 0) {
      ids.add(room.slice(3));
    }
  }

  return ids;
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value ? value.slice(0, max) : null;
}

async function startServer() {
  try {
    await nextApp.prepare();

    // Online flags from before a restart are meaningless.
    await prisma.tvDevice.updateMany({ data: { isOnline: false } });

    const httpServer = createServer(async (request, response) => {
      try {
        await requestHandler(request, response);
      } catch (error) {
        console.error("Next.js request error:", error);

        if (!response.headersSent) {
          response.statusCode = 500;
          response.end("Internal server error");
        }
      }
    });

    const io = new Server(httpServer, {
      path: "/socket.io",
      cors: {
        origin: dev
          ? ["http://localhost:3000", "http://localhost:8081", "http://localhost:8082"]
          : [process.env.NEXT_PUBLIC_APP_URL].filter((o): o is string => Boolean(o)),
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    setSocketServer(io);

    io.on("connection", (socket) => {
      // ------------------------------------------------------------
      // Pairing
      // ------------------------------------------------------------
      socket.on(
        "tv:pairing:join",
        (
          payload: { pairingCode?: string },
          acknowledge?: (response: { success: boolean; message?: string }) => void
        ) => {
          const code = payload?.pairingCode?.trim().toUpperCase();

          if (!code) {
            acknowledge?.({ success: false, message: "Pairing code is required." });
            return;
          }

          void socket.join(pairingRoom(code));
          acknowledge?.({ success: true });
        }
      );

      // ------------------------------------------------------------
      // TV authentication. The ack carries the full state, so a TV that
      // reboots mid-workout rejoins the running plan with one round trip.
      // ------------------------------------------------------------
      socket.on(
        "tv:authenticate",
        async (
          payload: { deviceToken?: string },
          acknowledge?: (response: {
            success: boolean;
            message?: string;
            data?: Awaited<ReturnType<typeof getTvState>>;
          }) => void
        ) => {
          try {
            const device = await findDeviceByToken(payload?.deviceToken?.trim() ?? "");

            if (!device) {
              acknowledge?.({ success: false, message: "Invalid TV credentials." });
              return;
            }

            socket.data.deviceId = device.id;
            socket.data.branchId = device.branchId;

            await socket.join(tvRoom(device.id));

            const now = new Date();

            await prisma.tvDevice.update({
              where: { id: device.id },
              data: { isOnline: true, lastSeenAt: now },
            });

            io.to(adminBranchRoom(device.branchId)).emit("tv:device-status", {
              deviceId: device.id,
              isOnline: true,
              lastSeenAt: now.toISOString(),
            });

            acknowledge?.({ success: true, data: await getTvState(device) });
          } catch (error) {
            console.error("TV authentication error:", error);
            acknowledge?.({ success: false, message: "Unable to authenticate TV." });
          }
        }
      );

      // ------------------------------------------------------------
      // TV -> admin status relay. Identity always comes from the
      // authenticated socket, never from the payload.
      // ------------------------------------------------------------
      socket.on(
        "tv:status",
        (payload: {
          broadcastId?: string;
          phaseIndex?: number;
          state?: string;
          message?: string;
        }) => {
          const deviceId = socket.data.deviceId as string | undefined;
          const branchId = socket.data.branchId as string | undefined;

          if (!deviceId || !branchId) {
            return;
          }

          const status: TvStatusPayload = {
            deviceId,
            broadcastId: text(payload?.broadcastId, 64),
            phaseIndex: Number.isInteger(payload?.phaseIndex)
              ? (payload.phaseIndex as number)
              : null,
            state: text(payload?.state, 24) ?? "UNKNOWN",
            message: text(payload?.message, 200),
            at: new Date().toISOString(),
          };

          latestTvStatus.set(deviceId, status);
          io.to(adminBranchRoom(branchId)).emit("tv:status", status);
        }
      );

      // ------------------------------------------------------------
      // Admin subscription (listen only)
      // ------------------------------------------------------------
      socket.on(
        "admin:subscribe",
        async (
          payload: { token?: string; branchId?: string },
          acknowledge?: (response: {
            success: boolean;
            message?: string;
            data?: {
              onlineDeviceIds: string[];
              statuses: TvStatusPayload[];
            };
          }) => void
        ) => {
          try {
            const branchId = payload?.branchId?.trim();

            if (!branchId || !verifyAdminSocketToken(payload?.token)) {
              acknowledge?.({ success: false, message: "Not authorised." });
              return;
            }

            await socket.join(adminBranchRoom(branchId));

            const devices = await prisma.tvDevice.findMany({
              where: { branchId, revokedAt: null },
              select: { id: true },
            });

            const online = connectedTvIds(io);
            const ids = devices.map((device) => device.id);

            acknowledge?.({
              success: true,
              data: {
                onlineDeviceIds: ids.filter((id) => online.has(id)),
                statuses: ids.flatMap((id) => {
                  const status = latestTvStatus.get(id);
                  return status ? [status] : [];
                }),
              },
            });
          } catch (error) {
            console.error("Admin subscribe error:", error);
            acknowledge?.({ success: false, message: "Unable to subscribe." });
          }
        }
      );

      socket.on("disconnect", () => {
        const deviceId = socket.data.deviceId as string | undefined;
        const branchId = socket.data.branchId as string | undefined;

        if (!deviceId || !branchId) {
          return;
        }

        // A TV usually reconnects within a second; avoid flapping.
        setTimeout(async () => {
          if (isTvConnected(io, deviceId)) {
            return;
          }

          try {
            const now = new Date();

            await prisma.tvDevice.updateMany({
              where: { id: deviceId },
              data: { isOnline: false, lastSeenAt: now },
            });

            latestTvStatus.delete(deviceId);

            io.to(adminBranchRoom(branchId)).emit("tv:device-status", {
              deviceId,
              isOnline: false,
              lastSeenAt: now.toISOString(),
            });
          } catch (error) {
            console.error("TV offline update error:", error);
          }
        }, OFFLINE_GRACE_MS);
      });
    });

    // ------------------------------------------------------------
    // Sweeper: finish broadcasts whose plans have run out, and tidy
    // expired pairing codes.
    // ------------------------------------------------------------
    let sweeping = false;
    let sweeps = 0;

    setInterval(async () => {
      if (sweeping) {
        return;
      }

      sweeping = true;

      try {
        for (const broadcast of await completeFinishedBroadcasts()) {
          publishBroadcastState(io, broadcast);
        }

        sweeps += 1;

        if (sweeps % 60 === 0) {
          await cleanupPairingSessions();
        }
      } catch (error) {
        console.error("Broadcast sweeper error:", error);
      } finally {
        sweeping = false;
      }
    }, SWEEP_INTERVAL_MS);

    httpServer.once("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });

    httpServer.listen(port, hostname, () => {
      console.log(`Fuel server running at http://${hostname}:${port}`);
      console.log("Socket.IO path: /socket.io");
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
}

void startServer();
