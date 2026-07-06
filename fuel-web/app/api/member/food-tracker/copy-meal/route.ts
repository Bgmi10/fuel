import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { mealId } = await req.json();

    if (!mealId) {
      return NextResponse.json(
        {
          success: false,
          message: "mealId is required",
        },
        {
          status: 400,
        }
      );
    }

    // Existing food log meal
    const foodLogMeal = await prisma.foodLogMeal.findUnique({
      where: {
        id: mealId,
      },
      include: {
        items: true,
        foodLog: {
          include: {
            member: {
              include: {
                dietPlans: {
                  where: {
                    isActive: true,
                  },
                  take: 1,
                  include: {
                    meals: {
                      include: {
                        items: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!foodLogMeal) {
      return NextResponse.json(
        {
          success: false,
          message: "Meal not found",
        },
        {
          status: 404,
        }
      );
    }

    const activePlan =
      foodLogMeal.foodLog.member.dietPlans[0];

    if (!activePlan) {
      return NextResponse.json(
        {
          success: false,
          message: "No active diet plan found",
        },
        {
          status: 404,
        }
      );
    }

    const dietMeal = activePlan.meals.find(
      (meal) => meal.name === foodLogMeal.name
    );

    if (!dietMeal) {
      return NextResponse.json(
        {
          success: false,
          message: "Matching meal not found in diet plan",
        },
        {
          status: 404,
        }
      );
    }

    // Already copied once
    if (foodLogMeal.items.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyCopied: true,
        data: foodLogMeal,
      });
    }

    // Copy all foods
    await prisma.foodLogMealItem.createMany({
      data: dietMeal.items.map((item) => ({
        mealId: foodLogMeal.id,

        externalFoodId: item.externalFoodId,

        foodName: item.foodName,
        brandName: item.brandName,
        nutritionMultiplier: item.nutritionMultiplier,
        servingValue: parseFloat(item.servingValue),

        quantity: item.quantity,
        servingUnit: item.servingUnit,

        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    });

    const updatedMeal =
      await prisma.foodLogMeal.findUnique({
        where: {
          id: foodLogMeal.id,
        },
        include: {
          items: true,
        },
      });

    return NextResponse.json({
      success: true,
      alreadyCopied: false,
      data: updatedMeal,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to copy assigned meal",
      },
      {
        status: 500,
      }
    );
  }
}