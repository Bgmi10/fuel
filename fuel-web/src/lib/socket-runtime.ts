import type { Server } from "socket.io";

type SocketRuntime = typeof globalThis & {
  fuelTvSocketServer?: Server;
};

const socketRuntime = globalThis as SocketRuntime;

export function setSocketServer(io: Server): void {
  socketRuntime.fuelTvSocketServer = io;
}

export function getSocketServer(): Server | null {
  return socketRuntime.fuelTvSocketServer ?? null;
}