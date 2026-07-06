import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";



export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }>}
  ) {
    try {
        const { id } = await params;
   
  
      if (!id) {
        return NextResponse.json(
          {
            success: false,
            message: "Item ID required",
          },
          { status: 400 }
        );
      }
  
      await prisma.foodLogMealItem.delete({
        where: {
          id,
        },
      });
  
      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Failed to delete food item",
        },
        { status: 500 }
      );
    }
  }
  
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }>}
  ) {
    const { id } = await params;
    try {
      const {
        consumed,
      } = await req.json();
  
      if (!id) {
        return NextResponse.json(
          {
            success: false,
            message: "Item ID required",
          },
          { status: 400 }
        );
      }
  
      const item =
        await prisma.foodLogMealItem.update({
          where: {
            id,
          },
          data: {
            consumed,
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
            "Failed to update food item",
        },
        { status: 500 }
      );
    }
  }
