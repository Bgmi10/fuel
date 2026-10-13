import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { getSocketServer } from "@/src/lib/socket-runtime";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    /*
     * Get the broadcast and the TVs assigned to it.
     */
    const broadcast = await prisma.workoutBroadcast.findUnique({
      where: {
        id,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },

        tvs: {
          include: {
            tvDevice: {
              select: {
                id: true,
                name: true,
                branchId: true,
              },
            },
          },
        },
      },
    });

    if (!broadcast) {
      return NextResponse.json(
        {
          success: false,
          message: "Broadcast not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Only a LIVE broadcast can be stopped.
     */
    if (broadcast.status !== "LIVE") {
      return NextResponse.json(
        {
          success: false,
          message: `Broadcast is not LIVE. Current status: ${broadcast.status}`,
        },
        { status: 400 }
      );
    }

    /*
     * Socket.IO is required because the TVs need
     * to immediately leave the broadcast player.
     */
    const io = getSocketServer();

    if (!io) {
      return NextResponse.json(
        {
          success: false,
          message: "Socket server is not initialized.",
        },
        { status: 503 }
      );
    }

    /*
     * Make sure the selected TVs still belong to
     * the broadcast branch.
     */
    const invalidTv = broadcast.tvs.find(
      (broadcastTv) =>
        broadcastTv.tvDevice.branchId !== broadcast.branchId
    );

    if (invalidTv) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more selected TVs do not belong to this branch.",
        },
        { status: 400 }
      );
    }

    /*
     * Mark the broadcast as COMPLETED.
     */
    const updatedBroadcast =
      await prisma.workoutBroadcast.update({
        where: {
          id: broadcast.id,
        },

        data: {
          status: "COMPLETED",
        },

        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },

          tvs: {
            include: {
              tvDevice: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

    /*
     * Payload sent to every TV that participated
     * in this broadcast.
     */
    const payload = {
      broadcastId: updatedBroadcast.id,
      branchId: updatedBroadcast.branchId,
      branchName: updatedBroadcast.branch.name,
      status: updatedBroadcast.status,
    };

    /*
     * Tell each selected TV to stop the current
     * workout broadcast.
     */
    for (const tv of updatedBroadcast.tvs) {
      io.to(`tv:${tv.tvDevice.id}`).emit(
        "tv:workout-broadcast-stop",
        {
          ...payload,
          tvDeviceId: tv.tvDevice.id,
          tvName: tv.tvDevice.name,
        }
      );
    }

    return NextResponse.json({
      success: true,
      broadcast: updatedBroadcast,

      sentTo: updatedBroadcast.tvs.map((tv) => ({
        tvDeviceId: tv.tvDevice.id,
        tvName: tv.tvDevice.name,
      })),
    });
  } catch (error) {
    console.error(
      "POST /api/workout-broadcasts/[id]/stop error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to stop broadcast.",
      },
      { status: 500 }
    );
  }
}