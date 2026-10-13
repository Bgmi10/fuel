import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseOptionalInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    return null;
  }

  return number;
}

function parsePositiveInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function validateExercises(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      error: "At least one exercise is required",
    };
  }

  const exercises: {
    videoId?: string;
    exerciseName?: string;
    sortOrder: number;
  }[] = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    if (!item || typeof item !== "object") {
      return {
        error: `Invalid exercise at position ${index + 1}`,
      };
    }

    const videoId =
      typeof item.videoId === "string" && item.videoId.trim()
        ? item.videoId.trim()
        : null;

    const exerciseName =
      typeof item.exerciseName === "string" && item.exerciseName.trim()
        ? item.exerciseName.trim()
        : null;

    if (!videoId && !exerciseName) {
      return {
        error: `Exercise ${index + 1} must have either a videoId or exerciseName`,
      };
    }

    if (videoId && exerciseName) {
      return {
        error: `Exercise ${index + 1} cannot have both videoId and exerciseName`,
      };
    }

    exercises.push({
      ...(videoId ? { videoId } : {}),
      ...(exerciseName ? { exerciseName } : {}),
      sortOrder: index,
    });
  }

  return {
    exercises,
  };
}

async function getSchedule(id: string) {
  return prisma.workoutSchedule.findUnique({
    where: {
      id,
    },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          subtitle: true,
          description: true,
          intensity: true,
          isActive: true,
        },
      },
      exercises: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          video: true,
        },
      },
      broadcasts: {
        select: {
          id: true,
          branchId: true,
          mode: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          broadcasts: true,
        },
      },
    },
  });
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const schedule = await getSchedule(id);

    if (!schedule) {
      return NextResponse.json(
        {
          error: "Workout schedule not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error(
      "GET /api/workout-schedules/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch workout schedule",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const existingSchedule = await prisma.workoutSchedule.findUnique({
      where: {
        id,
      },
      include: {
        broadcasts: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        {
          error: "Workout schedule not found",
        },
        {
          status: 404,
        }
      );
    }

    const {
      date,
      programId,
      exercises,

      demonstrationSeconds,
      warmupSeconds,
      prepareSeconds,
      workSeconds,
      restSeconds,
      sets,
      cycles,
      restBetweenCycleSeconds,
      coolDownSeconds,
      nextSessionStartsAt,
    } = body;

    /*
     * -----------------------------------------
     * DATE
     * -----------------------------------------
     */

    let parsedDate: Date | undefined;

    if (date !== undefined) {
      parsedDate = parseDate(date) ?? undefined;

      if (!parsedDate) {
        return NextResponse.json(
          {
            error: "Invalid schedule date",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * -----------------------------------------
     * PROGRAM
     * -----------------------------------------
     */

    let newProgramId: string | undefined;

    if (programId !== undefined) {
      if (
        typeof programId !== "string" ||
        !programId.trim()
      ) {
        return NextResponse.json(
          {
            error: "Program is required",
          },
          {
            status: 400,
          }
        );
      }

      const program = await prisma.workoutProgram.findUnique({
        where: {
          id: programId,
        },
        select: {
          id: true,
          isActive: true,
        },
      });

      if (!program) {
        return NextResponse.json(
          {
            error: "Workout program not found",
          },
          {
            status: 404,
          }
        );
      }

      if (!program.isActive) {
        return NextResponse.json(
          {
            error: "Cannot use an inactive workout program",
          },
          {
            status: 400,
          }
        );
      }

      newProgramId = program.id;
    }

    /*
     * -----------------------------------------
     * EXERCISES
     * -----------------------------------------
     */

    let scheduleExercises:
      | {
          videoId?: string;
          exerciseName?: string;
          sortOrder: number;
        }[]
      | null = null;

    if (exercises !== undefined) {
      const exerciseValidation = validateExercises(exercises);

      if ("error" in exerciseValidation) {
        return NextResponse.json(
          {
            error: exerciseValidation.error,
          },
          {
            status: 400,
          }
        );
      }

      scheduleExercises = exerciseValidation.exercises;

      const videoIds = scheduleExercises
        .map((exercise) => exercise.videoId)
        .filter((videoId): videoId is string => Boolean(videoId));

      if (videoIds.length > 0) {
        const videos = await prisma.workoutVideo.findMany({
          where: {
            id: {
              in: [...new Set(videoIds)],
            },
            isActive: true,
          },
          select: {
            id: true,
          },
        });

        const validVideoIds = new Set(
          videos.map((video) => video.id)
        );

        const invalidVideoIds = videoIds.filter(
          (videoId) => !validVideoIds.has(videoId)
        );

        if (invalidVideoIds.length > 0) {
          return NextResponse.json(
            {
              error:
                "One or more selected library videos are invalid or inactive",
              invalidVideoIds,
            },
            {
              status: 400,
            }
          );
        }
      }
    }

    /*
     * -----------------------------------------
     * TIMER VALIDATION
     * -----------------------------------------
     */

    const timerFields: {
      demonstrationSeconds?: number | null;
      warmupSeconds?: number | null;
      prepareSeconds?: number | null;
      workSeconds?: number | null;
      restSeconds?: number | null;
      sets?: number | null;
      cycles?: number | null;
      restBetweenCycleSeconds?: number | null;
      coolDownSeconds?: number | null;
    } = {};

    const timerDefinitions = [
      ["demonstrationSeconds", demonstrationSeconds, false],
      ["warmupSeconds", warmupSeconds, false],
      ["prepareSeconds", prepareSeconds, false],
      ["workSeconds", workSeconds, false],
      ["restSeconds", restSeconds, false],
      ["sets", sets, true],
      ["cycles", cycles, true],
      ["restBetweenCycleSeconds", restBetweenCycleSeconds, false],
      ["coolDownSeconds", coolDownSeconds, false],
    ] as const;

    for (const [field, value, positiveOnly] of timerDefinitions) {
      if (value === undefined) {
        continue;
      }

      const parsed = positiveOnly
        ? parsePositiveInt(value)
        : parseOptionalInt(value);

      if (
        value !== null &&
        value !== "" &&
        parsed === null
      ) {
        return NextResponse.json(
          {
            error: `${field} must be a valid ${
              positiveOnly ? "positive" : "non-negative"
            } integer`,
          },
          {
            status: 400,
          }
        );
      }

      timerFields[field] = parsed;
    }

    /*
     * -----------------------------------------
     * NEXT SESSION
     * -----------------------------------------
     */

    let parsedNextSessionStartsAt:
      | Date
      | null
      | undefined;

    if (nextSessionStartsAt !== undefined) {
      if (
        nextSessionStartsAt === null ||
        nextSessionStartsAt === ""
      ) {
        parsedNextSessionStartsAt = null;
      } else {
        parsedNextSessionStartsAt =
          parseDate(nextSessionStartsAt);

        if (!parsedNextSessionStartsAt) {
          return NextResponse.json(
            {
              error: "Invalid nextSessionStartsAt",
            },
            {
              status: 400,
            }
          );
        }
      }
    }

    /*
     * -----------------------------------------
     * UPDATE
     * -----------------------------------------
     */

    const schedule = await prisma.$transaction(async (tx) => {
      await tx.workoutSchedule.update({
        where: {
          id,
        },
        data: {
          ...(parsedDate !== undefined
            ? {
                date: parsedDate,
              }
            : {}),

          ...(newProgramId !== undefined
            ? {
                programId: newProgramId,
              }
            : {}),

          ...timerFields,

          ...(parsedNextSessionStartsAt !== undefined
            ? {
                nextSessionStartsAt:
                  parsedNextSessionStartsAt,
              }
            : {}),
        },
      });

      if (scheduleExercises) {
        await tx.workoutScheduleExercise.deleteMany({
          where: {
            scheduleId: id,
          },
        });

        await tx.workoutScheduleExercise.createMany({
          data: scheduleExercises.map((exercise) => ({
            scheduleId: id,
            ...(exercise.videoId
              ? {
                  videoId: exercise.videoId,
                }
              : {}),
            ...(exercise.exerciseName
              ? {
                  exerciseName: exercise.exerciseName,
                }
              : {}),
            sortOrder: exercise.sortOrder,
          })),
        });
      }

      return tx.workoutSchedule.findUnique({
        where: {
          id,
        },
        include: {
          program: {
            select: {
              id: true,
              name: true,
              subtitle: true,
              description: true,
              intensity: true,
              isActive: true,
            },
          },
          exercises: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              video: true,
            },
          },
          broadcasts: {
            select: {
              id: true,
              branchId: true,
              mode: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          _count: {
            select: {
              broadcasts: true,
            },
          },
        },
      });
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error(
      "PATCH /api/workout-schedules/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update workout schedule",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existingSchedule = await prisma.workoutSchedule.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            broadcasts: true,
          },
        },
      },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        {
          error: "Workout schedule not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * A schedule that has already been used for a broadcast
     * should not be deleted because the broadcast references it.
     */
    if (existingSchedule._count.broadcasts > 0) {
      return NextResponse.json(
        {
          error:
            "This schedule cannot be deleted because it has existing broadcasts",
        },
        {
          status: 400,
        }
      );
    }

    await prisma.workoutSchedule.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/workout-schedules/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to delete workout schedule",
      },
      {
        status: 500,
      }
    );
  }
}