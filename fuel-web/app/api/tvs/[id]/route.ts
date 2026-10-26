import { NextRequest } from "next/server";

import { prisma } from "@/prisma";
import { getSocketServer } from "@/src/lib/socket-runtime";
import { HttpError } from "@/src/lib/tv/errors";
import { handleError, ok, type IdParams } from "@/src/lib/tv/http";
import { tvRoom } from "@/src/lib/tv/rooms";

/** Removes the TV for good and sends it back to the pairing screen. */
export async function DELETE(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;

    const running = await prisma.workoutBroadcastTV.findFirst({
      where: { tvDeviceId: id, broadcast: { status: { in: ["LIVE", "PAUSED"] } } },
      select: { id: true },
    });

    if (running) {
      throw new HttpError(409, "This TV is running a broadcast. Stop it first.");
    }

    await prisma.tvDevice.delete({ where: { id } });

    const io = getSocketServer();
    io?.to(tvRoom(id)).emit("tv:revoked", { deviceId: id });
    io?.in(tvRoom(id)).disconnectSockets(true);

    return ok({ deleted: true });
  } catch (error) {
    return handleError(error, "DELETE /api/tvs/[id]");
  }
}
