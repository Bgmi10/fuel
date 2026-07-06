import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";


export const GET = async (
  req: NextRequest
) => {
  try {
    const memberId =
      req.nextUrl.searchParams.get(
        "memberId"
      );

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          message: "Member ID required",
        },
        {
          status: 400,
        }
      );
    }

    const now = new Date();

    const startOfDay = new Date();
    startOfDay.setHours(
      0,
      0,
      0,
      0
    );

    const endOfDay = new Date();
    endOfDay.setHours(
      23,
      59,
      59,
      999
    );

    const activePlan =
      await prisma.dietPlan.findFirst({
        where: {
          memberId,
          isActive: true,

          startDate: {
            lte: now,
          },

          endDate: {
            gte: now,
          },
        },

        include: {
          meals: {
            include: {
              items: true,
            },

            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });

    const foodLog =
      await prisma.foodLog.findFirst({
        where: {
          memberId,

          logDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },

        include: {
          meals: {
            include: {
              items: true,
            },

            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });

    const consumed = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    foodLog?.meals.forEach(
      (meal) => {
        meal.items.forEach((item) => {

          if (!item.consumed) return;
          consumed.calories +=
            item.calories;

          consumed.protein +=
            item.protein;

          consumed.carbs +=
            item.carbs;

          consumed.fat += item.fat;
        });
      }
    );

    const targets = {
      calories:
        activePlan?.targetCalories ||
        0,

      protein:
        activePlan?.targetProtein ||
        0,

      carbs:
        activePlan?.targetCarbs || 0,

      fat:
        activePlan?.targetFat || 0,
    };

    const remaining = {
      calories: Math.max(
        0,
        targets.calories -
          consumed.calories
      ),

      protein: Math.max(
        0,
        targets.protein -
          consumed.protein
      ),

      carbs: Math.max(
        0,
        targets.carbs -
          consumed.carbs
      ),

      fat: Math.max(
        0,
        targets.fat -
          consumed.fat
      ),
    };

    return NextResponse.json({
      success: true,

      data: {
        hasLogToday: !!foodLog,

        activePlan,

        foodLog,

        targets,

        consumed,

        remaining,
      },
    });
  } catch (error) {
    console.error(
      "Get food tracker error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load food tracker",
      },
      {
        status: 500,
      }
    );
  }
};