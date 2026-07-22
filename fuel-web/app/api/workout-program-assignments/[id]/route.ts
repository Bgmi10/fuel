import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import {
    WorkoutProgramAssignmentStatus,
  } from "@prisma/client";
  
  import { prisma } from "@/prisma";
  
  
  const ALLOWED_STATUSES =
    new Set<WorkoutProgramAssignmentStatus>([
      "SCHEDULED",
      "LIVE",
      "COMPLETED",
      "CANCELLED",
    ]);
  
  export async function PATCH(
    request: NextRequest,
    context: {
      params: Promise<{
        id: string;
      }>;
    }
  ) {
    try {
      const { id } = await context.params;
      const body = await request.json();
  
      const status =
        typeof body.status === "string"
          ? body.status.toUpperCase()
          : "";
  
      if (
        !ALLOWED_STATUSES.has(
          status as WorkoutProgramAssignmentStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "A valid schedule status is required.",
          },
          {
            status: 400,
          }
        );
      }
  
      const existing =
        await prisma.workoutProgramAssignment.findUnique({
          where: {
            id,
          },
        });
  
      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Broadcast schedule was not found.",
          },
          {
            status: 404,
          }
        );
      }
  
      const assignment =
        await prisma.workoutProgramAssignment.update({
          where: {
            id,
          },
  
          data: {
            status:
              status as WorkoutProgramAssignmentStatus,
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
                        durationSeconds: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
  
      return NextResponse.json({
        success: true,
        assignment,
      });
    } catch (error) {
      console.error(
        "Update workout assignment error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to update the broadcast schedule.",
        },
        {
          status: 500,
        }
      );
    }
  }