import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  try {
    const existingItem =
      await prisma.foodLogMealItem.findUnique({
        where: {
          id,
        },
      });

    if (!existingItem) {
      return NextResponse.json(
        {
          message: "Food item not found.",
        },
        {
          status: 404,
        }
      );
    }

    const quantity =
      Number(body.quantity ?? existingItem.quantity);

      
      const multiplier =
        quantity / existingItem.quantity;
      
      const updatedItem =
        await prisma.foodLogMealItem.update({
          where: { id },
          data: {
            quantity,
      
            calories: Number(
              (existingItem.calories * multiplier).toFixed(1)
            ),
      
            protein: Number(
              (existingItem.protein * multiplier).toFixed(1)
            ),
      
            carbs: Number(
              (existingItem.carbs * multiplier).toFixed(1)
            ),
      
            fat: Number(
              (existingItem.fat * multiplier).toFixed(1)
            ),
      
            consumed:
              body.consumed ??
              existingItem.consumed,
      
            consumedAt:
              body.consumed === true
                ? new Date()
                : body.consumed === false
                ? null
                : existingItem.consumedAt,
          },
        });

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}