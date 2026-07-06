import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    
    try {
        const dietPlan = await prisma.dietPlan.findUnique({
            where: { id },
            include: {
                meals: {
                    include: {
                        items: true 
                    }
                }
            }
        });

        if (!dietPlan) {
            return Response.json(
                { success: false, error: "Diet plan not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: dietPlan });
    } catch (e) {
        console.error("Diet plan fetch error:", e);
        return Response.json(
            {
                success: false,
                error: "Failed to fetch diet plan"
            },
            {
                status: 500,
            }
        );
    }
};

export const PUT = async (
    req: NextRequest,
    {
      params,
    }: {
      params: Promise<{ id: string }>
    }
  ) => {
    const body = await req.json();
    const { id } = await params;
  
    const {
      title,
      instructions,
      startDate,
      endDate,
    
      macroDistributionType,
    
      targetCalories,
    
      targetProtein,
      targetCarbs,
      targetFat,
    
      targetProteinPercentage,
      targetCarbsPercentage,
      targetFatPercentage,
    
      meals,
    } = body;


    let proteinGrams = Number(targetProtein);
let carbsGrams = Number(targetCarbs);
let fatGrams = Number(targetFat);

if (macroDistributionType === "PERCENTAGE") {
  proteinGrams =
    (Number(targetCalories) *
      Number(targetProteinPercentage)) /
    100 /
    4;

  carbsGrams =
    (Number(targetCalories) *
      Number(targetCarbsPercentage)) /
    100 /
    4;

  fatGrams =
    (Number(targetCalories) *
      Number(targetFatPercentage)) /
    100 /
    9;
}
  
    try {
      const dietPlanId =
      id;
  
      await prisma.dietPlanMealItem.deleteMany(
        {
          where: {
            meal: {
              dietPlanId,
            },
          },
        }
      );
  
      await prisma.dietPlanMeal.deleteMany({
        where: {
          dietPlanId,
        },
      });
  
      const updated =
        await prisma.dietPlan.update({
          where: {
            id: dietPlanId,
          },
  
          data: {
            title,
            instructions,
  
            startDate:
              new Date(startDate),
  
            endDate: endDate
              ? new Date(endDate)
              : undefined,
  
              macroDistributionType,

              targetCalories: Number(targetCalories),
              
              targetProtein: proteinGrams,
              targetCarbs: carbsGrams,
              targetFat: fatGrams,
              
              targetProteinPercentage:
                macroDistributionType === "PERCENTAGE"
                  ? Number(targetProteinPercentage)
                  : null,
              
              targetCarbsPercentage:
                macroDistributionType === "PERCENTAGE"
                  ? Number(targetCarbsPercentage)
                  : null,
              
              targetFatPercentage:
                macroDistributionType === "PERCENTAGE"
                  ? Number(targetFatPercentage)
                  : null,
            meals: {
              create:
                meals?.map(
                  (
                    meal: any,
                    index: number
                  ) => ({
                    name: meal.name,
  
                    sortOrder: index,
  
                    items: {
                      create:
                        meal.foods?.map(
                          (
                            food: any
                          ) => ({
                            externalFoodId:
                              food.foodId,
                              nutritionMultiplier: food.nutritionMultiplier,
                            foodName:
                              food.foodName,
  
                            brandName:
                              food.brandName,
  
                            quantity:
                              food.quantity,
  
                            servingValue:
                              String(
                                food.servingValue
                              ),
  
                            servingUnit:
                              food.servingUnit,
  
                            calories:
                              food.calories,
  
                            protein:
                              food.protein,
  
                            carbs:
                              food.carbs,
  
                            fat:
                              food.fat,
                          })
                        ) || [],
                    },
                  })
                ) || [],
            },
          },
  
          include: {
            meals: {
              include: {
                items: true,
              },
            },
          },
        });
  
      return Response.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error(error);
  
      return Response.json(
        {
          success: false,
        },
        {
          status: 500,
        }
      );
    }
  };

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    
    try {
        await prisma.dietPlan.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Diet plan deletion error:", e);
        return Response.json(
            {
                success: false,
                error: "Failed to delete diet plan"
            },
            {
                status: 500,
            }
        );
    }
};