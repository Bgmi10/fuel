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
    const copiedDietItemIds = new Set(
      foodLogMeal.items
        .map((item) => item.copiedFromDietItemId)
        .filter(
          (id): id is string =>
            typeof id === "string"
        )
    );
    
    const itemsToCopy = dietMeal.items.filter(
      (item) => !copiedDietItemIds.has(item.id)
    );

    if (itemsToCopy.length === 0) {
      return NextResponse.json({
        success: true,
        alreadyCopied: true,
        message:
          "All foods from this assigned meal are already in the tracker",
        data: foodLogMeal,
      });
    }
    
    await prisma.foodLogMealItem.createMany({
      data: itemsToCopy.map((item) => {
        const base = Number(item.servingValue);
        const factor = base > 0 ? item.quantity / base : 1;
      
        return {
          mealId: foodLogMeal.id,
          copiedFromDietItemId: item.id,
          externalFoodId: item.externalFoodId,
          foodName: item.foodName,
          brandName: item.brandName,
          consumed: true,
          consumedAt: new Date(),
      
          quantity: item.quantity,
          servingUnit: item.servingUnit,
          nutritionMultiplier: item.nutritionMultiplier,
      
          // macros are now final for `quantity`, so the reference base equals quantity.
          // If the tracker rescales with quantity / servingValue when the member
          // edits the amount, this stays correct.
          servingValue: item.quantity,
      
          calories: item.calories * factor,
          protein: item.protein * factor,
          carbs: item.carbs * factor,
          fat: item.fat * factor,
        };
      }),
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