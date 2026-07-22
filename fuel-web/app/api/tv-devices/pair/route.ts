import crypto from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getSocketServer,
} from "@/src/lib/socket-runtime";
import { prisma } from "@/prisma";

export const runtime = "nodejs";

type PairTvBody = {
  pairingCode?: string;
  branchId?: string;
  deviceName?: string;
};

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * IMPORTANT:
     * Validate the auth-token cookie here using
     * your existing dashboard authentication.
     *
     * Allow only the roles that should manage TV:
     * SUPER_ADMIN, ADMIN and/or COACH/TRAINER.
     */

    const body =
      (await request.json()) as PairTvBody;

    const pairingCode =
      body.pairingCode
        ?.trim()
        .toUpperCase();

    const branchId =
      body.branchId?.trim();

    const deviceName =
      body.deviceName?.trim();

    if (
      !pairingCode ||
      pairingCode.length !== 6
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter the valid six-character pairing code.",
        },
        {
          status: 400,
        }
      );
    }

    if (!branchId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Select a branch.",
        },
        {
          status: 400,
        }
      );
    }

    if (!deviceName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a name for the TV.",
        },
        {
          status: 400,
        }
      );
    }

    const io = getSocketServer();

    if (!io) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The real-time server is unavailable.",
        },
        {
          status: 503,
        }
      );
    }

    const [
      branch,
      pairingSession,
    ] = await Promise.all([
      prisma.branch.findUnique({
        where: {
          id: branchId,
        },

        select: {
          id: true,
          name: true,
        },
      }),

      prisma.tvPairingSession.findUnique({
        where: {
          pairingCode,
        },
      }),
    ]);

    if (!branch) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected branch was not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!pairingSession) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The pairing code is invalid. Check the code shown on the TV.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      pairingSession.status !==
      "WAITING"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This pairing code has already been used.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      pairingSession.expiresAt <=
      new Date()
    ) {
      await prisma.tvPairingSession.update({
        where: {
          id: pairingSession.id,
        },

        data: {
          status: "EXPIRED",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "The pairing code has expired. Generate a new code on the TV.",
        },
        {
          status: 410,
        }
      );
    }

    const deviceToken =
      crypto
        .randomBytes(48)
        .toString("base64url");

    const tokenHash =
      crypto
        .createHash("sha256")
        .update(deviceToken)
        .digest("hex");

    const device =
      await prisma.$transaction(
        async (transaction) => {
          const claimedSession =
            await transaction
              .tvPairingSession
              .updateMany({
                where: {
                  id:
                    pairingSession.id,

                  status: "WAITING",

                  expiresAt: {
                    gt: new Date(),
                  },
                },

                data: {
                  status: "PAIRED",
                },
              });

          if (
            claimedSession.count !== 1
          ) {
            throw new Error(
              "PAIRING_SESSION_ALREADY_CLAIMED"
            );
          }

          const createdDevice =
            await transaction
              .tvDevice
              .create({
                data: {
                  name: deviceName,
                  branchId,
                  deviceToken: tokenHash,
                  isOnline: false,
                },

                include: {
                  branch: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              });

          await transaction
            .tvPairingSession
            .update({
              where: {
                id:
                  pairingSession.id,
              },

              data: {
                deviceId:
                  createdDevice.id,
              },
            });

          return createdDevice;
        }
      );

    io.to(
      `pairing:${pairingCode}`
    ).emit("tv:paired", {
      deviceId: device.id,
      deviceToken,
      deviceName: device.name,
      branchId: device.branch.id,
      branchName: device.branch.name,
      pairedAt:
        device.pairedAt.toISOString(),
    });

    return NextResponse.json({
      success: true,

      device: {
        ...device,

        pairedAt:
          device.pairedAt.toISOString(),

        createdAt:
          device.createdAt.toISOString(),

        updatedAt:
          device.updatedAt.toISOString(),

        lastSeenAt:
          device.lastSeenAt?.toISOString() ??
          null,
      },
    });
  } catch (error) {
    console.error(
      "Pair TV error:",
      error
    );

    if (
      error instanceof Error &&
      error.message ===
        "PAIRING_SESSION_ALREADY_CLAIMED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another user has already paired this TV.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to pair the TV.",
      },
      {
        status: 500,
      }
    );
  }
}