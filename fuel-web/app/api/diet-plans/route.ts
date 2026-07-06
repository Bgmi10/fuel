import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
  
    try {
        const plans = await prisma.dietPlan.findMany({
            where: {
              memberId: memberId ?? '',
            },
            orderBy: [
              {
                isActive: "desc",
              },
              {
                startDate: "desc",
              },
            ],
            include: {
              _count: {
                select: {
                  meals: true,
                },
              },
            },
          });

        return NextResponse.json({ success: true, data: plans });
    } catch (e) {
        console.error("Diet plans fetch error:", e);
        return Response.json(
            {
                success: false,
                error: "Failed to fetch diet plans"
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
  try {
    const {
      memberId,
    
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
    } = await req.json();


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

    await prisma.dietPlan.updateMany({
      where: {
        memberId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    
    const dietPlan =
      await prisma.dietPlan.create({
        data: {
          memberId,

          title,
          instructions,

          targetCalories:
            Number(targetCalories),
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

          startDate: new Date(
            startDate
          ),

          endDate: new Date(
            endDate
          ),

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
                            food.brandName ||
                            null,

                          quantity:
                            Number(
                              food.quantity
                            ),

                          servingValue:
                            String(
                              food.servingValue
                            ),

                          servingUnit:
                            food.servingUnit,

                          calories:
                            Number(
                              food.calories
                            ),

                          protein:
                            Number(
                              food.protein
                            ),

                          carbs:
                            Number(
                              food.carbs
                            ),

                          fat: Number(
                            food.fat
                          ),
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
              id: true,
              name: true,
            },
          },

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

    return NextResponse.json({
      success: true,
      data: dietPlan,
    });
  } catch (error) {
    console.error(
      "Create diet plan error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create diet plan",
      },
      {
        status: 500,
      }
    );
  }
};