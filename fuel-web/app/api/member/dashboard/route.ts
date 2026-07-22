import {
    InvoicePaymentStatus,
    InvoiceStatus,
    SlotBookingEnum,
    SubscriptionStatus,
  } from "@prisma/client";
  
  import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import {
    getMemberFromRequest,
  } from "@/app/utils/memberAuth";
  
  import { prisma } from "@/prisma";
  
  export const dynamic =
    "force-dynamic";
  
  const INDIA_OFFSET_MS =
    330 * 60 * 1000;
  
  const DAY_MS =
    24 * 60 * 60 * 1000;
  
  const pad = (
    value: number
  ) =>
    String(value).padStart(
      2,
      "0"
    );
  
  const toDateKey = (
    year: number,
    month: number,
    day: number
  ) =>
    `${year}-${pad(month)}-${pad(day)}`;
  
  const getIndiaDateKey = (
    date = new Date()
  ) => {
    const shifted =
      new Date(
        date.getTime() +
          INDIA_OFFSET_MS
      );
  
    return toDateKey(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() +
        1,
      shifted.getUTCDate()
    );
  };
  
  const indiaDayStartToUtc = (
    dateKey: string
  ) => {
    const [
      year,
      month,
      day,
    ] = dateKey
      .split("-")
      .map(Number);
  
    return new Date(
      Date.UTC(
        year,
        month - 1,
        day
      ) -
        INDIA_OFFSET_MS
    );
  };
  
  const addDaysToDateKey = (
    dateKey: string,
    days: number
  ) => {
    const [
      year,
      month,
      day,
    ] = dateKey
      .split("-")
      .map(Number);
  
    const result =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day + days
        )
      );
  
    return toDateKey(
      result.getUTCFullYear(),
      result.getUTCMonth() +
        1,
      result.getUTCDate()
    );
  };
  
  const indiaDayEndToUtc = (
    dateKey: string
  ) =>
    new Date(
      indiaDayStartToUtc(
        addDaysToDateKey(
          dateKey,
          1
        )
      ).getTime() - 1
    );
  
  const getIndiaMinutesNow = () => {
    const shifted =
      new Date(
        Date.now() +
          INDIA_OFFSET_MS
      );
  
    return (
      shifted.getUTCHours() *
        60 +
      shifted.getUTCMinutes()
    );
  };
  
  const timeToMinutes = (
    value: string
  ) => {
    const [
      hour,
      minute,
    ] = value
      .split(":")
      .map(Number);
  
    return (
      hour * 60 +
      minute
    );
  };
  
  const dateKeyDifference = (
    from: string,
    to: string
  ) => {
    const fromTime =
      Date.parse(
        `${from}T00:00:00.000Z`
      );
  
    const toTime =
      Date.parse(
        `${to}T00:00:00.000Z`
      );
  
    return Math.floor(
      (toTime - fromTime) /
        DAY_MS
    );
  };
  
  export async function GET(
    req: NextRequest
  ) {
    try {
      const authenticatedMember =
        await getMemberFromRequest(
          req
        );
  
      if (!authenticatedMember) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unauthorized",
          },
          {
            status: 401,
          }
        );
      }
  
      const memberId =
        authenticatedMember.id;
  
      const todayKey =
        getIndiaDateKey();
  
      const todayStart =
        indiaDayStartToUtc(
          todayKey
        );
  
      const todayEnd =
        indiaDayEndToUtc(
          todayKey
        );
  
      const [
        member,
        subscriptions,
        outstandingInvoices,
        latestPayment,
        upcomingBookings,
        assessments,
        activeDietPlan,
        todayFoodLog,
        activeWorkoutPlan,
      ] =
        await Promise.all([
          prisma.member.findUnique({
            where: {
              id: memberId,
            },
  
            select: {
              id: true,
              name: true,
              profileImage: true,
              onBoardCompleted:
                true,
            },
          }),
  
          prisma.subscription.findMany({
            where: {
              memberId,
  
              status: {
                in: [
                  SubscriptionStatus
                    .ACTIVE,
  
                  SubscriptionStatus
                    .FROZEN,
                ],
              },
            },
  
            select: {
              id: true,
              serviceName: true,
              packageName: true,
              branchName: true,
              usageType: true,
              totalSessions: true,
              remainingSessions:
                true,
              startDate: true,
              endDate: true,
              status: true,
            },
  
            orderBy: {
              endDate: "asc",
            },
          }),
  
          prisma.invoice.findMany({
            where: {
              memberId,
  
              status: {
                not:
                  InvoiceStatus
                    .CANCELLED,
              },
  
              balanceAmount: {
                gt: 0,
              },
            },
  
            select: {
              id: true,
              invoiceNumber: true,
              serviceName: true,
              packageName: true,
              balanceAmount: true,
              finalAmount: true,
              paidAmount: true,
              status: true,
              createdAt: true,
            },
  
            orderBy: {
              createdAt: "desc",
            },
          }),
  
          prisma.payment.findFirst({
            where: {
              memberId,
  
              status:
                InvoicePaymentStatus
                  .PAID,
            },
  
            select: {
              id: true,
              receiptNumber: true,
              amount: true,
              paymentMode: true,
              paidAt: true,
  
              invoice: {
                select: {
                  packageName: true,
                  serviceName: true,
                },
              },
            },
  
            orderBy: {
              paidAt: "desc",
            },
          }),
  
          prisma.slotBooking.findMany({
            where: {
              memberId,
  
              status:
                SlotBookingEnum
                  .BOOKED,
  
              bookingDate: {
                gte:
                  todayStart,
              },
            },
  
            select: {
              id: true,
              bookingDate: true,
              bookingDay: true,
              status: true,
  
              slot: {
                select: {
                  id: true,
                  name: true,
                  startTime: true,
                  endTime: true,
                },
              },
  
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
  
              package: {
                select: {
                  id: true,
                  name: true,
  
                  service: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
  
            orderBy: {
              bookingDate:
                "asc",
            },
  
            take: 20,
          }),
  
          prisma.fitnessAssessment
            .findMany({
              where: {
                memberId,
              },
  
              select: {
                id: true,
                weight: true,
                height: true,
                bmi: true,
                bodyFatPercentage:
                  true,
                assessmentDate:
                  true,
              },
  
              orderBy: {
                assessmentDate:
                  "desc",
              },
  
              take: 2,
            }),
  
          prisma.dietPlan.findFirst({
            where: {
              memberId,
              isActive: true,
  
              startDate: {
                lte:
                  todayEnd,
              },
  
              endDate: {
                gte:
                  todayStart,
              },
            },
  
            select: {
              id: true,
              title: true,
              targetCalories: true,
              targetProtein: true,
              targetCarbs: true,
              targetFat: true,
              macroDistributionType:
                true,
              targetProteinPercentage:
                true,
              targetCarbsPercentage:
                true,
              targetFatPercentage:
                true,
              startDate: true,
              endDate: true,
            },
  
            orderBy: {
              startDate: "desc",
            },
          }),
  
          prisma.foodLog.findFirst({
            where: {
              memberId,
  
              logDate: {
                gte:
                  todayStart,
  
                lte:
                  todayEnd,
              },
            },
  
            select: {
              id: true,
              logDate: true,
  
              meals: {
                select: {
                  id: true,
                  name: true,
                  sortOrder: true,
  
                  items: {
                    select: {
                      id: true,
                      foodName: true,
                      calories: true,
                      protein: true,
                      carbs: true,
                      fat: true,
                    },
                  },
                },
  
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          }),
  
          prisma.workoutPlan.findFirst({
            where: {
              memberId,
              isActive: true,
  
              startDate: {
                lte:
                  todayEnd,
              },
  
              OR: [
                {
                  endDate:
                    null,
                },
                {
                  endDate: {
                    gte:
                      todayStart,
                  },
                },
              ],
            },
  
            select: {
              id: true,
              title: true,
              description: true,
              startDate: true,
              endDate: true,
  
              days: {
                select: {
                  id: true,
                  dayNumber: true,
                  name: true,
  
                  exercises: {
                    select: {
                      id: true,
                      exerciseName:
                        true,
                      sets: true,
                      reps: true,
                      weight: true,
                      restSeconds:
                        true,
                      notes: true,
                      sortOrder:
                        true,
                    },
  
                    orderBy: {
                      sortOrder:
                        "asc",
                    },
                  },
                },
  
                orderBy: {
                  dayNumber: "asc",
                },
              },
            },
  
            orderBy: {
              startDate: "desc",
            },
          }),
        ]);
  
      if (!member) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Member not found",
          },
          {
            status: 404,
          }
        );
      }
  
      const now =
        new Date();
  
      const memberships =
        subscriptions.map(
          (subscription) => {
            const daysRemaining =
              Math.max(
                0,
                Math.ceil(
                  (
                    subscription
                      .endDate
                      .getTime() -
                    now.getTime()
                  ) /
                    DAY_MS
                )
              );
  
            const usedSessions =
              subscription
                .totalSessions !==
                  null &&
              subscription
                .remainingSessions !==
                  null
                ? Math.max(
                    subscription
                      .totalSessions -
                      subscription
                        .remainingSessions,
                    0
                  )
                : null;
  
            return {
              ...subscription,
              daysRemaining,
              usedSessions,
            };
          }
        );
  
      const nextExpiry =
        memberships[0] ||
        null;
  
      const outstandingBalance =
        outstandingInvoices.reduce(
          (
            total,
            invoice
          ) =>
            total +
            invoice.balanceAmount,
          0
        );
  
      const nowMinutes =
        getIndiaMinutesNow();
  
      const nextBooking =
        upcomingBookings
          .map(
            (booking) => ({
              ...booking,
  
              resolvedBookingDay:
                booking.bookingDay ||
                getIndiaDateKey(
                  booking.bookingDate
                ),
            })
          )
          .filter(
            (booking) => {
              if (
                booking
                  .resolvedBookingDay >
                todayKey
              ) {
                return true;
              }
  
              if (
                booking
                  .resolvedBookingDay <
                todayKey
              ) {
                return false;
              }
  
              return (
                timeToMinutes(
                  booking.slot
                    .endTime
                ) >=
                nowMinutes
              );
            }
          )
          .sort(
            (first, second) => {
              const dateComparison =
                first
                  .resolvedBookingDay
                  .localeCompare(
                    second
                      .resolvedBookingDay
                  );
  
              if (
                dateComparison !==
                0
              ) {
                return dateComparison;
              }
  
              return (
                timeToMinutes(
                  first.slot
                    .startTime
                ) -
                timeToMinutes(
                  second.slot
                    .startTime
                )
              );
            }
          )[0] || null;
  
      const latestAssessment =
        assessments[0] ||
        null;
  
      const previousAssessment =
        assessments[1] ||
        null;
  
      const weightChange =
        latestAssessment
          ?.weight !== null &&
        latestAssessment
          ?.weight !== undefined &&
        previousAssessment
          ?.weight !== null &&
        previousAssessment
          ?.weight !== undefined
          ? Number(
              (
                latestAssessment
                  .weight -
                previousAssessment
                  .weight
              ).toFixed(2)
            )
          : null;
  
      const bodyFatChange =
        latestAssessment
          ?.bodyFatPercentage !==
          null &&
        latestAssessment
          ?.bodyFatPercentage !==
          undefined &&
        previousAssessment
          ?.bodyFatPercentage !==
          null &&
        previousAssessment
          ?.bodyFatPercentage !==
          undefined
          ? Number(
              (
                latestAssessment
                  .bodyFatPercentage -
                previousAssessment
                  .bodyFatPercentage
              ).toFixed(2)
            )
          : null;
  
      const foodItems =
        todayFoodLog?.meals
          .flatMap(
            (meal) =>
              meal.items
          ) || [];
  
      const nutritionLogged =
        foodItems.reduce(
          (
            totals,
            item
          ) => ({
            calories:
              totals.calories +
              item.calories,
  
            protein:
              totals.protein +
              item.protein,
  
            carbs:
              totals.carbs +
              item.carbs,
  
            fat:
              totals.fat +
              item.fat,
          }),
          {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }
        );
  
      const normalizedNutrition =
        {
          calories:
            Number(
              nutritionLogged
                .calories
                .toFixed(1)
            ),
  
          protein:
            Number(
              nutritionLogged
                .protein
                .toFixed(1)
            ),
  
          carbs:
            Number(
              nutritionLogged
                .carbs
                .toFixed(1)
            ),
  
          fat:
            Number(
              nutritionLogged
                .fat
                .toFixed(1)
            ),
        };
  
      let todayWorkout =
        null;
  
      if (
        activeWorkoutPlan &&
        activeWorkoutPlan
          .days.length > 0
      ) {
        const planStartKey =
          getIndiaDateKey(
            activeWorkoutPlan
              .startDate
          );
  
        const elapsedDays =
          Math.max(
            0,
            dateKeyDifference(
              planStartKey,
              todayKey
            )
          );
  
        const cycleIndex =
          elapsedDays %
          activeWorkoutPlan
            .days.length;
  
        const workoutDay =
          activeWorkoutPlan
            .days[cycleIndex];
  
        todayWorkout = {
          planId:
            activeWorkoutPlan.id,
  
          planTitle:
            activeWorkoutPlan.title,
  
          description:
            activeWorkoutPlan
              .description,
  
          dayId:
            workoutDay.id,
  
          dayNumber:
            workoutDay.dayNumber,
  
          dayName:
            workoutDay.name,
  
          exerciseCount:
            workoutDay
              .exercises.length,
  
          exercises:
            workoutDay.exercises.map(
              (exercise) => ({
                ...exercise,
  
                weight:
                  exercise.weight !==
                  null
                    ? Number(
                        exercise.weight
                      )
                    : null,
              })
            ),
        };
      }
  
      return NextResponse.json(
        {
          success: true,
  
          generatedAt:
            new Date(),
  
          member,
  
          membershipSummary: {
            activeCount:
              memberships.length,
  
            nextExpiry:
              nextExpiry
                ? {
                    subscriptionId:
                      nextExpiry.id,
  
                    packageName:
                      nextExpiry
                        .packageName,
  
                    endDate:
                      nextExpiry
                        .endDate,
  
                    daysRemaining:
                      nextExpiry
                        .daysRemaining,
                  }
                : null,
          },
  
          memberships,
  
          paymentSummary: {
            outstandingBalance,
  
            outstandingInvoiceCount:
              outstandingInvoices
                .length,
  
            invoices:
              outstandingInvoices,
  
            latestPayment,
          },
  
          nextBooking,
  
          fitness: {
            latest:
              latestAssessment,
  
            previous:
              previousAssessment,
  
            weightChange,
  
            bodyFatChange,
          },
  
          nutrition: {
            plan:
              activeDietPlan,
  
            logged:
              normalizedNutrition,
  
            mealCount:
              todayFoodLog
                ?.meals.length ||
              0,
  
            foodItemCount:
              foodItems.length,
          },
  
          todayWorkout,
        },
        {
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    } catch (error) {
      console.error(
        "GET /api/member/dashboard error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
  
          message:
            "Failed to load dashboard.",
        },
        {
          status: 500,
        }
      );
    }
  }