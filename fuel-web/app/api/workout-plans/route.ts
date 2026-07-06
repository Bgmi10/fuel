import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (
  req: NextRequest
) => {
  const { searchParams } = new URL(
    req.url
  );

  const memberId =
    searchParams.get("memberId");
    
  const admin =
  searchParams.get("admin");
  const active =
    searchParams.get("active");
    const today = new Date();


    const where = {
      ...(memberId && { memberId }),
    
      ...(active !== null && {
        isActive: active === "true",
      }),
    
      ...(memberId && admin !== "true" &&  {
        endDate: {
            gte: today
        }
      }),
    };

  try {
    const workoutPlans =
      await prisma.workoutPlan.findMany({
        where,

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
                  sortOrder: "asc",
                },
              },
            },
          },

          _count: {
            select: {
              days: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      data: workoutPlans,
    });
  } catch (e) {
    console.error(
      "Workout plans fetch error:",
      e
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to fetch workout plans",
      },
      {
        status: 500,
      }
    );
  }
};

export const POST = async (
  req: NextRequest
) => {
  const {
    memberId,
    title,
    description,
    startDate,
    endDate,
    days,
  } = await req.json();

  try {
    const workoutPlan =
      await prisma.workoutPlan.create({
        data: {
          memberId,

          title,

          description,

          startDate: new Date(
            startDate
          ),

          endDate: endDate
            ? new Date(endDate)
            : null,

          days: {
            create:
              days?.map(
                (
                  day: {
                    dayNumber: number;
                    name: string;
                    exercises: any[];
                  }
                ) => ({
                  dayNumber:
                    day.dayNumber,

                  name: day.name,

                  exercises: {
                    create:
                      day.exercises?.map(
                        (
                          exercise: any,
                          index: number
                        ) => ({
                          exerciseName:
                            exercise.exerciseName,

                          sets:
                            exercise.sets
                              ? Number(
                                  exercise.sets
                                )
                              : null,

                          reps:
                            exercise.reps
                              ? Number(
                                  exercise.reps
                                )
                              : null,

                          weight:
                            exercise.weight
                              ? Number(
                                  exercise.weight
                                )
                              : null,

                          restSeconds:
                            exercise.restSeconds
                              ? Number(
                                  exercise.restSeconds
                                )
                              : null,

                          notes:
                            exercise.notes ||
                            null,

                          sortOrder:
                            exercise.sortOrder ??
                            index,
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
                  sortOrder: "asc",
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
      "Workout plan creation error:",
      e
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to create workout plan",
      },
      {
        status: 500,
      }
    );
  }
};