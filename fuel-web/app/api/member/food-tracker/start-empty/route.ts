import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (
  req: NextRequest
) => {
  try {
    const { memberId } =
      await req.json();

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Member id required",
        },
        {
          status: 400,
        }
      );
    }

    const startOfDay =
      new Date();

    startOfDay.setHours(
      0,
      0,
      0,
      0
    );

    const endOfDay =
      new Date();

    endOfDay.setHours(
      23,
      59,
      59,
      999
    );

    /**
     * Existing log for today
     */

    const existingLog =
      await prisma.foodLog.findFirst({
        where: {
          memberId,

          logDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },

        include: {
          meals: {
            include: {
              items: true,
            },

            orderBy: {
              sortOrder:
                "asc",
            },
          },
        },
      });

    if (existingLog) {
      return NextResponse.json({
        success: true,
        data: existingLog,
      });
    }

    /**
     * Create empty day
     */

    const foodLog =
      await prisma.foodLog.create({
        data: {
          memberId,

          logDate: startOfDay,

          meals: {
            create: [
              {
                name: "Breakfast",
                sortOrder: 1,
              },
              {
                name: "Lunch",
                sortOrder: 2,
              },
              {
                name: "Dinner",
                sortOrder: 3,
              },
              {
                name: "Snacks",
                sortOrder: 4,
              },
            ],
          },
        },

        include: {
          meals: {
            include: {
              items: true,
            },

            orderBy: {
              sortOrder:
                "asc",
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      data: foodLog,
    });
  } catch (error) {
    console.error(
      "Start empty tracker error",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to start tracking",
      },
      {
        status: 500,
      }
    );
  }
};