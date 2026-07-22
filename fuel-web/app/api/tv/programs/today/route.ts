import crypto from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/prisma";
import { getCorsHeaders } from "@/src/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INDIA_OFFSET_MINUTES = 330;

type EffectiveAssignmentStatus =
  | "UPCOMING"
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
  request: NextRequest
) {
  const corsHeaders =
    getCorsHeaders(request);

  try {
    const deviceToken =
      getBearerToken(request);

    if (!deviceToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "TV authentication token is required.",
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(deviceToken)
      .digest("hex");

    const device =
      await prisma.tvDevice.findFirst({
        where: {
          /*
           * Your current implementation stores
           * the SHA-256 hash in deviceToken.
           *
           * If your Prisma field is tokenHash,
           * replace this with:
           *
           * tokenHash
           */
          deviceToken: tokenHash,
        },

        select: {
          id: true,
          name: true,
          branchId: true,

          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    if (!device) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid or disconnected TV device.",
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const now = new Date();

    const {
      startOfDay,
      endOfDay,
      dateKey,
    } = getIndiaDayRange(now);

    const databaseAssignments =
      await prisma
        .workoutProgramAssignment
        .findMany({
          where: {
            branchId:
              device.branchId,

            scheduledAt: {
              gte: startOfDay,
              lt: endOfDay,
            },

            status: {
              in: [
                "SCHEDULED",
                "LIVE",
                "COMPLETED",
              ],
            },

            program: {
              isActive: true,
            },
          },

          orderBy: {
            scheduledAt: "asc",
          },

          include: {
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
        });

    const assignments =
      databaseAssignments
        .map((assignment) => {
          /*
           * Disabled videos are excluded from TV playback.
           */
          const activeItems =
            assignment.program.items.filter(
              (item) =>
                item.video.isActive
            );

          const durationSeconds =
            activeItems.reduce(
              (total, item) =>
                total +
                (item.video
                  .durationSeconds ?? 0),
              0
            );

          const startTime =
            assignment.scheduledAt.getTime();

          const endTime =
            startTime +
            durationSeconds * 1_000;

          const effectiveStatus =
            getEffectiveStatus({
              storedStatus:
                assignment.status,

              startTime,
              endTime,
              nowTime:
                now.getTime(),
            });

          return {
            id: assignment.id,
            branchId:
              assignment.branchId,
            programId:
              assignment.programId,

            scheduledAt:
              assignment.scheduledAt.toISOString(),

            estimatedEndAt:
              new Date(
                endTime
              ).toISOString(),

            status:
              assignment.status,

            effectiveStatus,

            durationSeconds,

            program: {
              id:
                assignment.program.id,

              name:
                assignment.program.name,

              description:
                assignment.program
                  .description,

              items:
                activeItems.map(
                  (item, index) => ({
                    id: item.id,

                    sortOrder:
                      index + 1,

                    video: {
                      id:
                        item.video.id,

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
          };
        })
        .filter(
          (assignment) =>
            assignment.program.items
              .length > 0
        );

    const currentAssignment =
      assignments.find(
        (assignment) =>
          assignment.effectiveStatus ===
          "LIVE"
      ) ?? null;

    const nextAssignment =
      assignments.find(
        (assignment) =>
          assignment.effectiveStatus ===
          "UPCOMING"
      ) ?? null;

    const latestCompletedAssignment =
      [...assignments]
        .reverse()
        .find(
          (assignment) =>
            assignment.effectiveStatus ===
            "COMPLETED"
        ) ?? null;

    const featuredAssignment =
      currentAssignment ??
      nextAssignment ??
      latestCompletedAssignment;

    return NextResponse.json(
      {
        success: true,

        date: dateKey,
        timezone: "Asia/Kolkata",

        serverTime:
          now.toISOString(),

        device: {
          id: device.id,
          name: device.name,
          branchId:
            device.branch.id,
          branchName:
            device.branch.name,
        },

        featuredAssignment,
        currentAssignment,
        nextAssignment,
        assignments,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error(
      "Load TV daily program error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load today's workout program.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

function getBearerToken(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const token = authorization
    .slice("Bearer ".length)
    .trim();

  return token || null;
}

function getIndiaDayRange(
  date: Date
) {
  const offsetMilliseconds =
    INDIA_OFFSET_MINUTES *
    60 *
    1_000;

  /*
   * Shift into India time and read its UTC
   * components as the India calendar date.
   */
  const indiaDate = new Date(
    date.getTime() +
      offsetMilliseconds
  );

  const year =
    indiaDate.getUTCFullYear();

  const month =
    indiaDate.getUTCMonth();

  const day =
    indiaDate.getUTCDate();

  /*
   * Convert India midnight back to UTC.
   */
  const startOfDay = new Date(
    Date.UTC(
      year,
      month,
      day,
      0,
      0,
      0,
      0
    ) - offsetMilliseconds
  );

  const endOfDay = new Date(
    Date.UTC(
      year,
      month,
      day + 1,
      0,
      0,
      0,
      0
    ) - offsetMilliseconds
  );

  const dateKey = [
    year,
    String(month + 1).padStart(
      2,
      "0"
    ),
    String(day).padStart(
      2,
      "0"
    ),
  ].join("-");

  return {
    startOfDay,
    endOfDay,
    dateKey,
  };
}

function getEffectiveStatus({
  storedStatus,
  startTime,
  endTime,
  nowTime,
}: {
  storedStatus: string;
  startTime: number;
  endTime: number;
  nowTime: number;
}): EffectiveAssignmentStatus {
  if (
    storedStatus === "COMPLETED"
  ) {
    return "COMPLETED";
  }

  if (storedStatus === "LIVE") {
    return "LIVE";
  }

  if (nowTime < startTime) {
    return "UPCOMING";
  }

  if (nowTime <= endTime) {
    return "LIVE";
  }

  return "COMPLETED";
}