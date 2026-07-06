import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  try {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            name: true,
            phone: true,
          },
        },
        days: {
          orderBy: {
            dayNumber: "asc",
          },
          include: {
            exercises: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

    if (!workoutPlan) {
      return NextResponse.json(
        {
          success: false,
          error: "Workout plan not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: workoutPlan,
    });
  } catch (e) {
    console.error("Workout plan fetch error:", e);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch workout plan",
      },
      {
        status: 500,
      }
    );
  }
};

export const PUT = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const {
    title,
    description,
    startDate,
    endDate,
    isActive,
    days,
  } = await req.json();

  try {
    await prisma.workoutPlan.update({
      where: { id },
      data: {
        title,
        description,
        startDate: startDate
          ? new Date(startDate)
          : undefined,
        endDate: endDate
          ? new Date(endDate)
          : null,
        isActive,

        days: {
          deleteMany: {},
        },
      },
    });

    const workoutPlan =
      await prisma.workoutPlan.update({
        where: { id },

        data: {
          days: {
            create:
              days?.map(
                (
                  day: any,
                  index: number
                ) => ({
                  name: day.name,
                  dayNumber:
                    day.dayNumber ??
                    index + 1,

                  exercises: {
                    create:
                      day.exercises?.map(
                        (
                          exercise: any
                        ) => ({
                          exerciseName:
                            exercise.exerciseName,

                          sets:
                            exercise.sets
                              ? parseInt(
                                  exercise.sets
                                )
                              : null,

                          reps:
                            exercise.reps
                              ? parseInt(
                                  exercise.reps
                                )
                              : null,

                          weight:
                            exercise.weight ||
                            null,

                            restSeconds:
                            Number(exercise.restSeconds) ||
                            null,

                          notes:
                            exercise.notes ||
                            null,
                        })
                      ) || [],
                  },
                })
              ) || [],
          },
        },

        include: {
          member: {
            select: {
              name: true,
              phone: true,
            },
          },

          days: {
            orderBy: {
              dayNumber: "asc",
            },

            include: {
              exercises: {
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: workoutPlan,
    });
  } catch (e) {
    console.error(
      "Workout plan update error:",
      e
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update workout plan",
      },
      {
        status: 500,
      }
    );
  }
};

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  try {
    await prisma.workoutPlan.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (e) {
    console.error(
      "Workout plan deletion error:",
      e
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete workout plan",
      },
      {
        status: 500,
      }
    );
  }
};