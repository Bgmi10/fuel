import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
    tvId: string;
  }>;
};

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id, tvId } = await context.params;

    const broadcastTV =
      await prisma.workoutBroadcastTV.findFirst({
        where: {
          id,
          tvDeviceId: tvId,
        },
        include: {
          tvDevice: {
            select: {
              id: true,
              name: true,
              isOnline: true,
              lastSeenAt: true,
            },
          },
          broadcast: {
            select: {
              id: true,
              branchId: true,
              mode: true,
              status: true,
            },
          },
          exercises: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              exercise: {
                include: {
                  video: true,
                },
              },
            },
          },
        },
      });

    if (!broadcastTV) {
      return NextResponse.json(
        {
          error: "TV is not assigned to this broadcast",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(broadcastTV);
  } catch (error) {
    console.error(
      "GET /api/workout-broadcasts/[id]/tvs/[tvId]/exercises error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch TV exercises",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id, tvId } = await context.params;
    const body = await req.json();

    const { exerciseIds } = body;

    if (!Array.isArray(exerciseIds)) {
      return NextResponse.json(
        {
          error: "exerciseIds must be an array",
        },
        {
          status: 400,
        }
      );
    }

    const uniqueExerciseIds = [
      ...new Set(
        exerciseIds.filter(
          (exerciseId: unknown): exerciseId is string =>
            typeof exerciseId === "string" &&
            exerciseId.trim().length > 0
        )
      ),
    ];

    const broadcastTV =
      await prisma.workoutBroadcastTV.findFirst({
        where: {
          id,
          tvDeviceId: tvId,
        },
        include: {
          broadcast: {
            select: {
              id: true,
              mode: true,
              status: true,
            },
          },
        },
      });

    if (!broadcastTV) {
      return NextResponse.json(
        {
          error: "TV is not assigned to this broadcast",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Timer-only broadcasts don't have exercises.
     */
    if (broadcastTV.broadcast.mode === "TIMER_ONLY") {
      return NextResponse.json(
        {
          error:
            "Exercises cannot be assigned to a TIMER_ONLY broadcast",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * We intentionally don't allow changing exercise
     * selection on a completed/cancelled broadcast.
     */
    if (
      broadcastTV.broadcast.status === "COMPLETED" ||
      broadcastTV.broadcast.status === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          error:
            "Exercises cannot be changed after the broadcast is completed or cancelled",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Empty selection is allowed.
     *
     * This is useful when the dashboard wants to remove
     * all exercises from a TV.
     */

    if (uniqueExerciseIds.length > 0) {
      const exercises =
        await prisma.workoutBroadcastExercise.findMany({
          where: {
            id: {
              in: uniqueExerciseIds,
            },
            broadcastId: broadcastTV.broadcast.id,
          },
          select: {
            id: true,
          },
        });

      const validExerciseIds = new Set(
        exercises.map((exercise) => exercise.id)
      );

      const invalidExerciseIds =
        uniqueExerciseIds.filter(
          (exerciseId) =>
            !validExerciseIds.has(exerciseId)
        );

      if (invalidExerciseIds.length > 0) {
        return NextResponse.json(
          {
            error:
              "One or more exercises do not belong to this broadcast",
            invalidExerciseIds,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Replace TV exercise selection.
     *
     * This only changes the mapping for this TV.
     * It does NOT change WorkoutBroadcastExercise.
     */
    await prisma.$transaction(async (tx) => {
      await tx.workoutBroadcastTVExercise.deleteMany({
        where: {
          broadcastTVId: broadcastTV.id,
        },
      });

      if (uniqueExerciseIds.length > 0) {
        await tx.workoutBroadcastTVExercise.createMany({
          data: uniqueExerciseIds.map(
            (exerciseId, index) => ({
              broadcastTVId: broadcastTV.id,
              exerciseId,
              sortOrder: index,
            })
          ),
        });
      }
    });

    const updated =
      await prisma.workoutBroadcastTV.findUnique({
        where: {
          id: broadcastTV.id,
        },
        include: {
          tvDevice: {
            select: {
              id: true,
              name: true,
              isOnline: true,
              lastSeenAt: true,
            },
          },
          exercises: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              exercise: {
                include: {
                  video: true,
                },
              },
            },
          },
        },
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(
      "PUT /api/workout-broadcasts/[id]/tvs/[tvId]/exercises error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update TV exercises",
      },
      {
        status: 500,
      }
    );
  }
}