import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const POST = async (
  req: NextRequest
) => {
  try {

    const { memberId } =
      await req.json();

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Member id required",
        },
        {
          status: 400,
        }
      );
    }
    const today = dayjs()
    .tz("Asia/Kolkata")
    .startOf("day")
    .toDate();

    /**
     * Existing log ?
     */

    const existingLog =
      await prisma.foodLog.findUnique({
        where: {
          memberId_logDate: {
            memberId,
            logDate: today,
          },
        },

        include: {
          meals: {
            include: {
              items: true,
            },

            orderBy: {
              sortOrder:
                "asc",
            },
          },
        },
      });

    if (existingLog) {
      return NextResponse.json({
        success: true,
        data: existingLog,
      });
    }

    /**
     * Active plan
     */

    const activePlan =
      await prisma.dietPlan.findFirst({
        where: {
          memberId,
          isActive: true,
        },

        include: {
          meals: {
            include: {
              items: true,
            },

            orderBy: {
              sortOrder:
                "asc",
            },
          },
        },
      });

    if (!activePlan) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No active diet plan found",
        },
        {
          status: 404,
        }
      );
    }

    /**
     * Create today's log
     */

    const foodLog =
      await prisma.foodLog.create({
        data: {
          memberId,

          logDate: today,

          meals: {
            create:
              activePlan.meals.map(
                (
                  meal,
                  index
                ) => ({
                  name:
                    meal.name,

                  sortOrder:
                    meal.sortOrder ??
                    index,

                  items: {
                    create:
                      meal.items.map(
                        (
                          item
                        ) => ({
                          externalFoodId:
                            item.externalFoodId,

                          foodName:
                            item.foodName,

                          brandName:
                            item.brandName,

                          quantity:
                            item.quantity,

                          servingUnit:
                            item.servingUnit,

                          calories:
                            item.calories,

                          protein:
                            item.protein,

                          carbs:
                            item.carbs,

                          fat:
                            item.fat,

                          consumed:
                            false,
                        })
                      ),
                  },
                })
              ),
          },
        },

        include: {
          meals: {
            include: {
              items: true,
            },

            orderBy: {
              sortOrder:
                "asc",
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: foodLog,
    });
  } catch (error) {
    console.error(
      "Start food tracker error",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to start tracking",
      },
      {
        status: 500,
      }
    );
  }
};