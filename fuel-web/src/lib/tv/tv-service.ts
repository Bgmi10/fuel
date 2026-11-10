/** TV-facing logic: credentials, pairing, and the state snapshot a TV syncs from. */
import { Prisma } from "@prisma/client";
import type { Server } from "socket.io";

import { prisma } from "../../../prisma";
import {
  broadcastInclude,
  buildTvPlans,
  LATE_START_GRACE_MS,
  shouldLoop,
} from "./broadcast-service";
import { toDateKey } from "./date-key";
import { HttpError } from "./errors";
import {
  normalizeTimers,
  PlanError,
  type BroadcastPlan,
  type PlanIntensity,
  type PlanTimers,
} from "./plan";
import { pairingRoom } from "./rooms";
import {
  generateDeviceToken,
  generatePairingCode,
  hashDeviceToken,
} from "./security";

export interface TvIdentity {
  id: string;
  name: string;
  branchId: string;
}

export async function findDeviceByToken(
  token: string
): Promise<TvIdentity | null> {
  if (!token) {
    return null;
  }

  return prisma.tvDevice.findFirst({
    where: { tokenHash: hashDeviceToken(token), revokedAt: null },
    select: { id: true, name: true, branchId: true },
  });
}

export async function authenticateTvRequest(req: Request): Promise<TvIdentity> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    throw new HttpError(401, "TV credentials are required.");
  }

  const device = await findDeviceByToken(token);

  if (!device) {
    throw new HttpError(401, "Invalid TV credentials.");
  }

  return device;
}

/** One card on the idle screen. The first one is shown large with every field. */
export interface TvUpcoming {
  broadcastId: string;
  title: string | null;
  subtitle: string | null;
  mode: "SCHEDULE" | "TIMER_ONLY";
  intensity: PlanIntensity | null;
  /** Auto-start time. null => an admin starts it manually. */
  nextSessionStartsAt: string | null;
  /** First video thumbnail for the small preview image (may be null). */
  thumbnailUrl: string | null;
  videoCount: number;
  /** Demonstration, warm-up, prepare, work, rest, sets, cycles, cycle rest, cool down. */
  timers: PlanTimers;
}

export interface TvState {
  serverNow: number;
  device: { id: string; name: string; branchId: string; branchName: string };
  /** Plan of the broadcast this TV should be showing right now, if any. */
  current: BroadcastPlan | null;
  /** Today's broadcasts that have not started, soonest first. */
  upcoming: TvUpcoming[];
}

export async function getTvState(device: TvIdentity): Promise<TvState> {
  const now = Date.now();

  const [branch, running, upcoming] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: device.branchId },
      select: { name: true },
    }),
    prisma.workoutBroadcast.findFirst({
      where: {
        status: { in: ["LIVE", "PAUSED"] },
        tvs: { some: { tvDeviceId: device.id } },
      },
      orderBy: { updatedAt: "desc" },
      include: broadcastInclude,
    }),
    prisma.workoutBroadcast.findMany({
      where: {
        status: "SCHEDULED",
        dateKey: toDateKey(new Date(now)),
        tvs: { some: { tvDeviceId: device.id } },
        // Hide timed broadcasts whose slot was missed by more than the grace window.
        OR: [
          { nextSessionStartsAt: null },
          { nextSessionStartsAt: { gt: new Date(now - LATE_START_GRACE_MS) } },
        ],
      },
      include: {
        exercises: {
          orderBy: { sortOrder: "asc" },
          select: { thumbnailUrl: true, durationSeconds: true },
        },
      },
    }),
  ]);

  let current: BroadcastPlan | null = null;

  if (running) {
    try {
      const loop = await shouldLoop(running);
      current = buildTvPlans(running, now, loop).get(device.id) ?? null;
    } catch (error) {
      if (!(error instanceof PlanError)) {
        throw error;
      }
    }
  }

  const sorted = [...upcoming].sort(
    (a, b) =>
      (a.nextSessionStartsAt?.getTime() ?? Infinity) -
        (b.nextSessionStartsAt?.getTime() ?? Infinity) ||
      a.createdAt.getTime() - b.createdAt.getTime()
  );

  return {
    serverNow: now,
    device: {
      id: device.id,
      name: device.name,
      branchId: device.branchId,
      branchName: branch?.name ?? "",
    },
    current,
    upcoming: sorted.map((row) => ({
      broadcastId: row.id,
      title: row.title,
      subtitle: row.subtitle,
      mode: row.mode,
      intensity: row.intensity,
      nextSessionStartsAt: row.nextSessionStartsAt?.toISOString() ?? null,
      thumbnailUrl:
        row.exercises.find((exercise) => exercise.thumbnailUrl)?.thumbnailUrl ??
        null,
      videoCount: row.exercises.length,
      timers: normalizeTimers(
        row,
        row.exercises.reduce(
          (max, exercise) => Math.max(max, exercise.durationSeconds ?? 0),
          0
        )
      ),
    })),
  };
}

// ------------------------------------------------------------------
// Pairing
// ------------------------------------------------------------------

const PAIRING_TTL_MS = 10 * 60_000;

export async function createPairingSession() {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const session = await prisma.tvPairingSession.create({
        data: {
          pairingCode: generatePairingCode(),
          expiresAt: new Date(Date.now() + PAIRING_TTL_MS),
        },
        select: { pairingCode: true, expiresAt: true },
      });

      return {
        pairingCode: session.pairingCode,
        expiresAt: session.expiresAt.toISOString(),
      };
    } catch (error) {
      const collision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!collision) {
        throw error;
      }
    }
  }

  throw new HttpError(503, "Unable to create a pairing code. Try again.");
}

export async function completePairing(
  io: Server | null | undefined,
  input: { pairingCode: string; name: string; branchId: string }
) {
  if (!io) {
    throw new HttpError(503, "The realtime server is not ready.");
  }

  const session = await prisma.tvPairingSession.findUnique({
    where: { pairingCode: input.pairingCode },
  });

  if (
    !session ||
    session.status !== "WAITING" ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    throw new HttpError(404, "This pairing code is invalid or has expired.");
  }

  const branch = await prisma.branch.findUnique({
    where: { id: input.branchId },
    select: { id: true, name: true },
  });

  if (!branch) {
    throw new HttpError(404, "Branch not found.");
  }

  // The raw token can only reach the TV through its pairing room.
  // Without a listener the device would be created and the token lost.
  const room = pairingRoom(session.pairingCode);
  const listeners = await io.in(room).fetchSockets();

  if (listeners.length === 0) {
    throw new HttpError(
      409,
      "That TV is not connected right now. Check the code on its screen and try again."
    );
  }

  const token = generateDeviceToken();

  const device = await prisma.$transaction(async (tx) => {
    const claimed = await tx.tvPairingSession.updateMany({
      where: { id: session.id, status: "WAITING" },
      data: { status: "PAIRED" },
    });

    if (claimed.count === 0) {
      throw new HttpError(409, "This code was already used.");
    }

    const created = await tx.tvDevice.create({
      data: {
        name: input.name,
        branchId: branch.id,
        tokenHash: hashDeviceToken(token),
      },
    });

    await tx.tvPairingSession.update({
      where: { id: session.id },
      data: { deviceId: created.id },
    });

    return created;
  });

  io.to(room).emit("tv:paired", {
    deviceId: device.id,
    deviceToken: token,
    deviceName: device.name,
    branchId: branch.id,
    branchName: branch.name,
    pairedAt: device.pairedAt.toISOString(),
  });

  return {
    id: device.id,
    name: device.name,
    branchId: branch.id,
    branchName: branch.name,
    pairedAt: device.pairedAt.toISOString(),
  };
}

/** Housekeeping, called occasionally by the server. */
export async function cleanupPairingSessions() {
  await prisma.tvPairingSession.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 60 * 60_000) } },
  });
}