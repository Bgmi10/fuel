import { createServer } from "node:http";
import next from "next";
import { Server, Socket } from "socket.io";
import crypto from "node:crypto";

import { setSocketServer } from "./src/lib/socket-runtime";
import { prisma } from "./prisma";

const dev = process.env.NODE_ENV !== "production";

const hostname =
  process.env.HOSTNAME || "0.0.0.0";

const port = Number(
  process.env.PORT || 3000
);

type AdminDashboardJoinResponse = {
  success: boolean;
  onlineDeviceIds: string[];
  message?: string;
};

type TvCommand =
  | "START"
  | "PLAY"
  | "PAUSE"
  | "NEXT"
  | "PREVIOUS"
  | "STOP";

type TvPlaybackStatus =
  | "IDLE"
  | "PLAYING"
  | "PAUSED"
  | "COMPLETED";

type TvPlaybackState = {
  deviceId: string;
  assignmentId?: string;
  status: TvPlaybackStatus;

  currentVideoId?: string | null;
  currentVideoName?: string | null;

  currentIndex: number;
  totalVideos: number;
  currentTime: number;
  updatedAt: string;
};

type ControllerDeviceSnapshot = {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  playbackState: TvPlaybackState | null;
};

type ControllerJoinResponse = {
  success: boolean;
  device?: ControllerDeviceSnapshot;
  message?: string;
};

type CommandResponse = {
  success: boolean;
  message?: string;
};

const allowedTvCommands =
  new Set<TvCommand>([
    "START",
    "PLAY",
    "PAUSE",
    "NEXT",
    "PREVIOUS",
    "STOP",
  ]);

/*
 * Latest playback state is kept in memory.
 * It lets a newly opened controller immediately
 * show what the TV is currently playing.
 */
const latestPlaybackByDevice =
  new Map<string, TvPlaybackState>();

const nextApp = next({
  dev,
  hostname,
  port,
});

const requestHandler =
  nextApp.getRequestHandler();

function getTvRoom(
  deviceId: string
) {
  return `tv:${deviceId}`;
}

function getAdminControllerRoom(
  deviceId: string
) {
  return `admin:tv:${deviceId}`;
}

function isTvConnected(
  io: Server,
  deviceId: string
) {
  const room =
    io.sockets.adapter.rooms.get(
      getTvRoom(deviceId)
    );

  return Boolean(room?.size);
}

async function getControllerDeviceSnapshot(
  io: Server,
  deviceId: string
): Promise<
  ControllerDeviceSnapshot | null
> {
  const device =
    await prisma.tvDevice.findUnique({
      where: {
        id: deviceId,
      },

      select: {
        id: true,
        name: true,
        branchId: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });

  if (!device) {
    return null;
  }

  const branch =
    device.branchId
      ? await prisma.branch.findUnique({
          where: {
            id: device.branchId,
          },

          select: {
            name: true,
          },
        })
      : null;

  return {
    id: device.id,
    name: device.name,
    branchId:
      device.branchId || "",
    branchName:
      branch?.name || "",
    isOnline:
      isTvConnected(
        io,
        device.id
      ),
    lastSeenAt:
      device.lastSeenAt
        ?.toISOString() || null,
    playbackState:
      latestPlaybackByDevice.get(
        device.id
      ) || null,
  };
}

function emitDeviceStatus(
  io: Server,
  payload: {
    deviceId: string;
    isOnline: boolean;
    lastSeenAt: string;
  }
) {
  /*
   * Existing dashboard event.
   */
  io.to(
    "admin:tv-dashboard"
  ).emit(
    "tv:device-status",
    payload
  );

  /*
   * Event consumed by the individual
   * remote-controller page.
   */
  io.to(
    getAdminControllerRoom(
      payload.deviceId
    )
  ).emit(
    "tv:connection-state",
    {
      deviceId:
        payload.deviceId,
      online:
        payload.isOnline,
      isOnline:
        payload.isOnline,
      lastSeenAt:
        payload.lastSeenAt,
    }
  );
}

async function startServer() {
  try {
    await nextApp.prepare();

    const httpServer =
      createServer(
        async (
          request,
          response
        ) => {
          try {
            await requestHandler(
              request,
              response
            );
          } catch (error) {
            console.error(
              "Next.js request error:",
              error
            );

            if (
              !response.headersSent
            ) {
              response.statusCode =
                500;

              response.end(
                "Internal server error"
              );
            }
          }
        }
      );

    const io =
      new Server(httpServer, {
        path: "/socket.io",

        cors: {
          origin: dev
            ? [
                "http://localhost:3000",
                "http://localhost:8081",
                "http://localhost:8082",
              ]
            : [
                process.env
                  .NEXT_PUBLIC_APP_URL,
              ].filter(
                (
                  origin
                ): origin is string =>
                  Boolean(origin)
              ),

          methods: [
            "GET",
            "POST",
          ],

          credentials: true,
        },

        transports: [
          "websocket",
          "polling",
        ],
      });

    setSocketServer(io);

    io.on(
      "connection",
      (socket) => {
        console.log(
          "Socket connected:",
          socket.id
        );

        /*
         * Admin dashboard online/offline list.
         */
        socket.on(
          "admin:tv-dashboard:join",
          async (
            _payload: Record<
              string,
              never
            >,
            acknowledge?: (
              response:
                AdminDashboardJoinResponse
            ) => void
          ) => {
            try {
              await socket.join(
                "admin:tv-dashboard"
              );

              const connectedSockets =
                await io.fetchSockets();

              const onlineDeviceIds =
                Array.from(
                  new Set(
                    connectedSockets
                      .filter(
                        (
                          connectedSocket
                        ) =>
                          connectedSocket
                            .data
                            .connectionType ===
                            "TV" &&
                          typeof connectedSocket
                            .data
                            .deviceId ===
                            "string"
                      )
                      .map(
                        (
                          connectedSocket
                        ) =>
                          connectedSocket
                            .data
                            .deviceId as string
                      )
                  )
                );

              acknowledge?.({
                success: true,
                onlineDeviceIds,
              });
            } catch (error) {
              console.error(
                "Join TV dashboard error:",
                error
              );

              acknowledge?.({
                success: false,
                onlineDeviceIds: [],
                message:
                  "Unable to load live TV statuses.",
              });
            }
          }
        );

        /*
         * Pairing-code room.
         */
        socket.on(
          "tv:pairing:join",
          (
            payload: {
              pairingCode?: string;
            },
            acknowledge?: (
              response: {
                success: boolean;
                message?: string;
              }
            ) => void
          ) => {
            const pairingCode =
              payload
                ?.pairingCode
                ?.trim()
                .toUpperCase();

            if (!pairingCode) {
              acknowledge?.({
                success: false,
                message:
                  "Pairing code is required.",
              });

              return;
            }

            const room =
              `pairing:${pairingCode}`;

            socket.join(room);

            console.log(
              `${socket.id} joined ${room}`
            );

            acknowledge?.({
              success: true,
            });
          }
        );

        /*
         * Authenticate the Android TV.
         *
         * This should run while the TV is on
         * Pair, Home, or Player, not only while
         * a video is open.
         */
        socket.on(
          "tv:authenticate",
          async (
            payload: {
              deviceId?: string;
              deviceToken?: string;
            },
            acknowledge?: (
              response: {
                success: boolean;
                message?: string;
              }
            ) => void
          ) => {
            try {
              const deviceId =
                payload
                  ?.deviceId
                  ?.trim();

              const deviceToken =
                payload
                  ?.deviceToken
                  ?.trim();

              if (
                !deviceId ||
                !deviceToken
              ) {
                acknowledge?.({
                  success: false,
                  message:
                    "Device credentials are missing.",
                });

                return;
              }

              const tokenHash =
                crypto
                  .createHash(
                    "sha256"
                  )
                  .update(
                    deviceToken
                  )
                  .digest("hex");

              const device =
                await prisma
                  .tvDevice
                  .findFirst({
                    where: {
                      id: deviceId,
                      deviceToken:
                        tokenHash,
                    },

                    select: {
                      id: true,
                      branchId: true,
                    },
                  });

              if (!device) {
                acknowledge?.({
                  success: false,
                  message:
                    "Invalid TV credentials.",
                });

                return;
              }

              socket.data
                .connectionType =
                "TV";

              socket.data.deviceId =
                device.id;

              socket.data.branchId =
                device.branchId;

              await socket.join(
                getTvRoom(
                  device.id
                )
              );

              if (
                device.branchId
              ) {
                await socket.join(
                  `branch:${device.branchId}`
                );
              }

              const now =
                new Date();

              await prisma
                .tvDevice
                .update({
                  where: {
                    id: device.id,
                  },

                  data: {
                    isOnline: true,
                    lastSeenAt: now,
                  },
                });

              emitDeviceStatus(
                io,
                {
                  deviceId:
                    device.id,
                  isOnline: true,
                  lastSeenAt:
                    now.toISOString(),
                }
              );

              acknowledge?.({
                success: true,
              });
            } catch (error) {
              console.error(
                "TV authentication error:",
                error
              );

              acknowledge?.({
                success: false,
                message:
                  "Unable to authenticate TV.",
              });
            }
          }
        );

        /*
         * Open one TV's remote controller.
         *
         * Both event names are supported:
         * - admin:tv-controller:join (new)
         * - admin:join-device (old)
         */
        const joinController =
          async (
            payload: {
              deviceId?: string;
            },
            acknowledge?: (
              response:
                ControllerJoinResponse
            ) => void
          ) => {
            try {
              const deviceId =
                payload
                  ?.deviceId
                  ?.trim();

              if (!deviceId) {
                acknowledge?.({
                  success: false,
                  message:
                    "Device ID is required.",
                });

                return;
              }

              /*
               * Add your admin-session authorization
               * check here before allowing the join.
               */
              const device =
                await getControllerDeviceSnapshot(
                  io,
                  deviceId
                );

              if (!device) {
                acknowledge?.({
                  success: false,
                  message:
                    "TV device was not found.",
                });

                return;
              }

              await socket.join(
                getAdminControllerRoom(
                  deviceId
                )
              );

              socket.data
                .controllerDeviceId =
                deviceId;

              acknowledge?.({
                success: true,
                device,
              });
            } catch (error) {
              console.error(
                "Join TV controller error:",
                error
              );

              acknowledge?.({
                success: false,
                message:
                  "Unable to open the TV controller.",
              });
            }
          };

        socket.on(
          "admin:tv-controller:join",
          joinController
        );

        socket.on(
          "admin:join-device",
          joinController
        );

        socket.on(
          "admin:tv-controller:leave",
          async (
            payload: {
              deviceId?: string;
            }
          ) => {
            const deviceId =
              payload
                ?.deviceId
                ?.trim();

            if (!deviceId) {
              return;
            }

            await socket.leave(
              getAdminControllerRoom(
                deviceId
              )
            );
          }
        );

        /*
         * Send a remote command.
         *
         * Both event names are supported:
         * - admin:tv:command (new)
         * - admin:tv-command (old)
         */
        const sendTvCommand =
          async (
            payload: {
              deviceId?: string;
              command?: TvCommand;
              assignmentId?: string;
            },
            acknowledge?: (
              response:
                CommandResponse
            ) => void
          ) => {
            try {
              const deviceId =
                payload
                  ?.deviceId
                  ?.trim();

              const command =
                payload?.command;

              const assignmentId =
                payload
                  ?.assignmentId
                  ?.trim();

              if (
                !deviceId ||
                !command ||
                !allowedTvCommands
                  .has(command)
              ) {
                acknowledge?.({
                  success: false,
                  message:
                    "Invalid TV command.",
                });

                return;
              }

              if (
                command === "START" &&
                !assignmentId
              ) {
                acknowledge?.({
                  success: false,
                  message:
                    "An assignment ID is required to start a workout.",
                });

                return;
              }

              if (
                !isTvConnected(
                  io,
                  deviceId
                )
              ) {
                acknowledge?.({
                  success: false,
                  message:
                    "This TV is currently offline.",
                });

                return;
              }

              io.to(
                getTvRoom(
                  deviceId
                )
              ).emit(
                "tv:command",
                {
                  command,
                  assignmentId:
                    assignmentId ||
                    null,
                  issuedAt:
                    new Date()
                      .toISOString(),
                }
              );

              acknowledge?.({
                success: true,
              });
            } catch (error) {
              console.error(
                "Send TV command error:",
                error
              );

              acknowledge?.({
                success: false,
                message:
                  "Unable to send the TV command.",
              });
            }
          };

        socket.on(
          "admin:tv:command",
          sendTvCommand
        );

        socket.on(
          "admin:tv-command",
          sendTvCommand
        );

        /*
         * Receive playback state from the
         * authenticated Android TV.
         */
        socket.on(
          "tv:playback-state",
          (
            payload: {
              assignmentId?: string;

              status?:
                | "IDLE"
                | "PLAYING"
                | "PAUSED"
                | "COMPLETED";

              currentVideoId?:
                | string
                | null;

              currentVideoName?:
                | string
                | null;

              currentIndex?: number;
              totalVideos?: number;
              currentTime?: number;
            }
          ) => {
            /*
             * Never trust deviceId from the client.
             * Always use the authenticated socket.
             */
            const deviceId =
              socket.data
                .deviceId as
                | string
                | undefined;

            if (
              !deviceId ||
              !payload?.status
            ) {
              return;
            }

            const playbackState:
              TvPlaybackState = {
              deviceId,

              assignmentId:
                payload.assignmentId,

              status:
                payload.status,

              currentVideoId:
                payload.currentVideoId ??
                null,

              currentVideoName:
                payload.currentVideoName ??
                null,

              currentIndex:
                Number.isFinite(
                  payload.currentIndex
                )
                  ? Number(
                      payload.currentIndex
                    )
                  : 0,

              totalVideos:
                Number.isFinite(
                  payload.totalVideos
                )
                  ? Number(
                      payload.totalVideos
                    )
                  : 0,

              currentTime:
                Number.isFinite(
                  payload.currentTime
                )
                  ? Number(
                      payload.currentTime
                    )
                  : 0,

              updatedAt:
                new Date()
                  .toISOString(),
            };

            latestPlaybackByDevice.set(
              deviceId,
              playbackState
            );

            /*
             * New controller event.
             */
            io.to(
              getAdminControllerRoom(
                deviceId
              )
            ).emit(
              "tv:playback-state",
              playbackState
            );

            /*
             * Backward-compatible old event.
             */
            io.to(
              getAdminControllerRoom(
                deviceId
              )
            ).emit(
              "tv:playback-updated",
              playbackState
            );
          }
        );

        socket.on(
          "disconnect",
          (reason) => {
            console.log(
              "Socket disconnected:",
              socket.id,
              reason
            );

            const deviceId =
              socket.data
                .deviceId as
                | string
                | undefined;

            if (!deviceId) {
              return;
            }

            /*
             * Wait briefly before marking offline.
             * A TV may reconnect immediately using
             * a new Socket.IO connection.
             */
            setTimeout(
              async () => {
                if (
                  isTvConnected(
                    io,
                    deviceId
                  )
                ) {
                  return;
                }

                try {
                  const now =
                    new Date();

                  await prisma
                    .tvDevice
                    .update({
                      where: {
                        id: deviceId,
                      },

                      data: {
                        isOnline: false,
                        lastSeenAt: now,
                      },
                    });

                  emitDeviceStatus(
                    io,
                    {
                      deviceId,
                      isOnline: false,
                      lastSeenAt:
                        now.toISOString(),
                    }
                  );
                } catch (error) {
                  console.error(
                    "TV offline update error:",
                    error
                  );
                }
              },
              1_500
            );
          }
        );
      }
    );

    httpServer.once(
      "error",
      (error) => {
        console.error(
          "Server error:",
          error
        );

        process.exit(1);
      }
    );

    httpServer.listen(
      port,
      hostname,
      () => {
        console.log(
          `Fuel server running at http://${hostname}:${port}`
        );

        console.log(
          "Socket.IO path: /socket.io"
        );
      }
    );
  } catch (error) {
    console.error(
      "Unable to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();