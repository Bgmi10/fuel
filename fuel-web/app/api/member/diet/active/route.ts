import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export const GET = async (
  req: Request
) => {
  try {
    const { searchParams } =
      new URL(req.url);

    const memberId =
      searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "memberId required",
        },
        {
          status: 400,
        }
      );
    }

    const today = new Date();

    const plan =
      await prisma.dietPlan.findFirst({
        where: {
          memberId,
          isActive: true,

          startDate: {
            lte: today,
          },

          endDate: {
            gte: today,
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

        orderBy: {
          createdAt: "desc",
        },
      });

    if (!plan) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const meals =
      plan.meals.map((meal) => {
        const totals =
          meal.items.reduce(
            (acc, item) => {
              acc.calories +=
                item.calories;

              acc.protein +=
                item.protein;

              acc.carbs +=
                item.carbs;

              acc.fat += item.fat;

              return acc;
            },
            {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
            }
          );

        return {
          ...meal,
          totals,
        };
      });

    const dailyTotals =
      meals.reduce(
        (acc, meal) => {
          acc.calories +=
            meal.totals.calories;

          acc.protein +=
            meal.totals.protein;

          acc.carbs +=
            meal.totals.carbs;

          acc.fat += meal.totals.fat;

          return acc;
        },
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      );

    return NextResponse.json({
      success: true,

      data: {
        ...plan,
        meals,
        dailyTotals,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch active diet plan",
      },
      {
        status: 500,
      }
    );
  }
};