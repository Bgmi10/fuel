import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const memberId =
    req.nextUrl.searchParams.get("memberId");

  const date =
    req.nextUrl.searchParams.get("date");

  if (!memberId || !date) {
    return NextResponse.json(
      {
        success: false,
        message:
          "memberId and date are required",
      },
      {
        status: 400,
      }
    );
  }

  const selectedDate = new Date(date);

  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(selectedDate);
  end.setHours(23, 59, 59, 999);

  try {
    const activePlan =
      await prisma.dietPlan.findFirst({
        where: {
          memberId,
          isActive: true,

          startDate: {
            lte: selectedDate,
          },

          endDate: {
            gte: selectedDate,
          },
        },

        select: {
          id: true,
          title: true,

          targetCalories: true,
          targetProtein: true,
          targetCarbs: true,
          targetFat: true,
        },
      });

    const foodLog =
      await prisma.foodLog.findFirst({
        where: {
          memberId,

          logDate: {
            gte: start,
            lte: end,
          },
        },

        include: {
          meals: {
            orderBy: {
              sortOrder: "asc",
            },

            include: {
              items: {
                orderBy: {
                  createdAt: "asc",
                },
              },
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

    foodLog?.meals.forEach((meal) => {
      meal.items.forEach((item) => {
        if (!item.consumed) return;

        consumed.calories += item.calories;
        consumed.protein += item.protein;
        consumed.carbs += item.carbs;
        consumed.fat += item.fat;
      });
    });

    const targets = {
      calories:
        activePlan?.targetCalories ?? 0,

      protein:
        activePlan?.targetProtein ?? 0,

      carbs:
        activePlan?.targetCarbs ?? 0,

      fat:
        activePlan?.targetFat ?? 0,
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
        targets.fat - consumed.fat
      ),
    };

    return NextResponse.json({
      success: true,

      data: {
        hasLog: !!foodLog,

        activePlan,

        foodLog,

        targets,

        consumed,

        remaining,
      },
    });
  } catch (err) {
    console.log(err);

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load member food log",
      },
      {
        status: 500,
      }
    );
  }
}