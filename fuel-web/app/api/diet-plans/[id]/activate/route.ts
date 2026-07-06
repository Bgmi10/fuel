
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  req: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    const plan = await prisma.dietPlan.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        memberId: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          message: "Diet plan not found",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.$transaction([
      prisma.dietPlan.updateMany({
        where: {
          memberId: plan.memberId,
        },
        data: {
          isActive: false,
        },
      }),

      prisma.dietPlan.update({
        where: {
          id,
        },
        data: {
          isActive: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Diet plan activated successfully",
    });
  } catch (error) {
    console.error("Activate diet plan error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
}