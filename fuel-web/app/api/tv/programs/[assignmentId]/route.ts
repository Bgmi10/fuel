import crypto from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/prisma";
import { getCorsHeaders } from "@/src/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AllowedPlaybackStatus =
  | "LIVE"
  | "COMPLETED";

export async function OPTIONS(
  request: NextRequest
) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      assignmentId: string;
    }>;
  }
) {
  const corsHeaders =
    getCorsHeaders(request);

  try {
    const { assignmentId } =
      await context.params;

    const device =
      await authenticateTvRequest(
        request
      );

    if (!device) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid TV credentials.",
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const assignment =
      await prisma.workoutProgramAssignment.findFirst(
        {
          where: {
            id: assignmentId,
            branchId: device.branchId,

            status: {
              not: "CANCELLED",
            },

            program: {
              isActive: true,
            },
          },

          include: {
            branch: {
              select: {
                id: true,
                name: true,
              },
            },

            program: {
              include: {
                items: {
                  orderBy: {
                    sortOrder: "asc",
                  },

                  include: {
                    video: {
                      select: {
                        id: true,
                        name: true,
                        videoUrl: true,
                        thumbnailUrl: true,
                        durationSeconds: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }
      );

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Workout assignment was not found for this TV.",
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    const activeItems =
      assignment.program.items.filter(
        (item) =>
          item.video.isActive
      );

    if (activeItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This workout program has no available videos.",
        },
        {
          status: 409,
          headers: corsHeaders,
        }
      );
    }

    const durationSeconds =
      activeItems.reduce(
        (total, item) =>
          total +
          (item.video
            .durationSeconds ?? 0),
        0
      );

    return NextResponse.json(
      {
        success: true,

        device: {
          id: device.id,
          name: device.name,
          branchId: device.branchId,
        },

        assignment: {
          id: assignment.id,
          programId:
            assignment.programId,
          branchId:
            assignment.branchId,

          scheduledAt:
            assignment.scheduledAt.toISOString(),

          status:
            assignment.status,

          durationSeconds,

          branch: assignment.branch,

          program: {
            id: assignment.program.id,
            name:
              assignment.program.name,
            description:
              assignment.program
                .description,

            items: activeItems.map(
              (item, index) => ({
                id: item.id,
                sortOrder: index + 1,

                video: {
                  id: item.video.id,
                  name:
                    item.video.name,
                  videoUrl:
                    item.video.videoUrl,
                  thumbnailUrl:
                    item.video
                      .thumbnailUrl,
                  durationSeconds:
                    item.video
                      .durationSeconds,
                },
              })
            ),
          },
        },
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error(
      "Load TV assignment error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load the workout program.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      assignmentId: string;
    }>;
  }
) {
  const corsHeaders =
    getCorsHeaders(request);

  try {
    const { assignmentId } =
      await context.params;

    const device =
      await authenticateTvRequest(
        request
      );

    if (!device) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid TV credentials.",
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const body = await request.json();

    const status =
      typeof body.status === "string"
        ? body.status.toUpperCase()
        : "";

    if (
      status !== "LIVE" &&
      status !== "COMPLETED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A valid playback status is required.",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const assignment =
      await prisma.workoutProgramAssignment.findFirst(
        {
          where: {
            id: assignmentId,
            branchId: device.branchId,

            status: {
              not: "CANCELLED",
            },
          },

          select: {
            id: true,
          },
        }
      );

    if (!assignment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Workout assignment was not found.",
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    const updatedAssignment =
      await prisma.workoutProgramAssignment.update(
        {
          where: {
            id: assignment.id,
          },

          data: {
            status:
              status as AllowedPlaybackStatus,
          },
        }
      );

    return NextResponse.json(
      {
        success: true,
        assignment:
          updatedAssignment,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error(
      "Update TV assignment status error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update workout status.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

async function authenticateTvRequest(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const rawToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (!rawToken) {
    return null;
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return prisma.tvDevice.findFirst({
    where: {
      /*
       * Your current schema appears to store
       * the token hash in deviceToken.
       *
       * Change to tokenHash here if that is
       * your actual Prisma field name.
       */
      deviceToken: tokenHash,
    },

    select: {
      id: true,
      name: true,
      branchId: true,
    },
  });
}