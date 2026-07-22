import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { prisma } from "@/prisma";
  
  
  export async function GET() {
    try {
      const assignments =
        await prisma.workoutProgramAssignment.findMany({
          orderBy: {
            scheduledAt: "asc",
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
        assignments,
      });
    } catch (error) {
      console.error(
        "Load workout assignments error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to load broadcast schedules.",
        },
        {
          status: 500,
        }
      );
    }
  }
  
  type CreateAssignmentBody = {
    programId?: string;
    branchIds?: string[];
    scheduledAt?: string;
  };
  
  export async function POST(
    request: NextRequest
  ) {
    try {
      const body =
        (await request.json()) as CreateAssignmentBody;
  
      const programId =
        typeof body.programId === "string"
          ? body.programId.trim()
          : "";
  
      const branchIds = Array.isArray(
        body.branchIds
      )
        ? [
            ...new Set(
              body.branchIds
                .filter(
                  (branchId): branchId is string =>
                    typeof branchId === "string"
                )
                .map((branchId) =>
                  branchId.trim()
                )
                .filter(Boolean)
            ),
          ]
        : [];
  
      const scheduledAt =
        typeof body.scheduledAt === "string"
          ? new Date(body.scheduledAt)
          : null;
  
      if (!programId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Select a workout program.",
          },
          {
            status: 400,
          }
        );
      }
  
      if (branchIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Select at least one branch.",
          },
          {
            status: 400,
          }
        );
      }
  
      if (
        !scheduledAt ||
        Number.isNaN(scheduledAt.getTime())
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Select a valid broadcast date and time.",
          },
          {
            status: 400,
          }
        );
      }
  
      if (
        scheduledAt.getTime() <
        Date.now() - 60_000
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The broadcast time cannot be in the past.",
          },
          {
            status: 400,
          }
        );
      }
  
      const [program, branches] =
        await Promise.all([
          prisma.workoutProgram.findFirst({
            where: {
              id: programId,
              isActive: true,
            },
  
            select: {
              id: true,
              name: true,
            },
          }),
  
          prisma.branch.findMany({
            where: {
              id: {
                in: branchIds,
              },
            },
  
            select: {
              id: true,
              name: true,
            },
          }),
        ]);
  
      if (!program) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The selected program is unavailable.",
          },
          {
            status: 404,
          }
        );
      }
  
      if (
        branches.length !== branchIds.length
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more selected branches were not found.",
          },
          {
            status: 400,
          }
        );
      }
  
      const existingAssignments =
        await prisma.workoutProgramAssignment.findMany({
          where: {
            programId,
            branchId: {
              in: branchIds,
            },
            scheduledAt,
            status: {
              not: "CANCELLED",
            },
          },
  
          select: {
            branchId: true,
          },
        });
  
      if (existingAssignments.length > 0) {
        const duplicateBranchIds = new Set(
          existingAssignments.map(
            (assignment) =>
              assignment.branchId
          )
        );
  
        const duplicateBranches = branches
          .filter((branch) =>
            duplicateBranchIds.has(branch.id)
          )
          .map((branch) => branch.name);
  
        return NextResponse.json(
          {
            success: false,
            message: `This program is already scheduled for: ${duplicateBranches.join(
              ", "
            )}.`,
          },
          {
            status: 409,
          }
        );
      }
  
      const assignments =
        await prisma.$transaction(
          branchIds.map((branchId) =>
            prisma.workoutProgramAssignment.create({
              data: {
                programId,
                branchId,
                scheduledAt,
                status: "SCHEDULED",
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
            })
          )
        );
  
      return NextResponse.json(
        {
          success: true,
          assignments,
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      console.error(
        "Create workout assignments error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to schedule the workout program.",
        },
        {
          status: 500,
        }
      );
    }
  }