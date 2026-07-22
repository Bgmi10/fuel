import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";


export async function POST(
  req: NextRequest
) {
  try {
    const {
      mealId,
      externalFoodId,
      foodName,
      brandName,
      quantity,
      nutritionMultiplier,
      servingValue,
      servingUnit,
      calories,
      protein,
      carbs,
      fat,
    } = await req.json();

    if (
      !mealId ||
      !foodName
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields",
        },
        { status: 400 }
      );
    }

    const item =
      await prisma.foodLogMealItem.create({
        data: {
          mealId,
          externalFoodId,
          foodName,
          brandName,
          consumed: true,
          nutritionMultiplier,
          servingValue,
          quantity:
            Number(quantity) || 0,
          servingUnit,
          calories:
            Number(calories) || 0,
          protein:
            Number(protein) || 0,
          carbs:
            Number(carbs) || 0,
          fat:
            Number(fat) || 0,
        },
      });

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to add food item",
      },
      { status: 500 }
    );
  }
}

