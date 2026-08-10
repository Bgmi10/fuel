import { prisma } from "@/prisma";
import {
  SlotWeekday,
} from "@prisma/client";
import {
  NextRequest,
  NextResponse,
} from "next/server";

const WEEKDAY_ORDER: SlotWeekday[] = [
  SlotWeekday.MONDAY,
  SlotWeekday.TUESDAY,
  SlotWeekday.WEDNESDAY,
  SlotWeekday.THURSDAY,
  SlotWeekday.FRIDAY,
  SlotWeekday.SATURDAY,
  SlotWeekday.SUNDAY,
];

export async function GET(
  request: NextRequest
) {
  try {
    const subscriptionId =
      request.nextUrl.searchParams
        .get("subscriptionId")
        ?.trim();

    if (!subscriptionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Subscription ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const subscription =
      await prisma.subscription.findUnique({
        where: {
          id: subscriptionId,
        },

        select: {
          id: true,
          status: true,
          branchId: true,
          startDate: true,
          endDate: true,

          package: {
            select: {
              serviceId: true,
            },
          },
        },
      });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Membership was not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      subscription.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This membership is not active.",
        },
        {
          status: 400,
        }
      );
    }

    const slots =
      await prisma.slot.findMany({
        where: {
          branchId:
            subscription.branchId,

          serviceId:
            subscription.package
              .serviceId,

          isActive: true,
        },

        select: {
          daysOfWeek: true,
        },
      });

    const configuredDays =
      new Set<SlotWeekday>();

    for (const slot of slots) {
      for (
        const day of slot.daysOfWeek
      ) {
        configuredDays.add(day);
      }
    }

    const daysOfWeek =
      WEEKDAY_ORDER.filter((day) =>
        configuredDays.has(day)
      );

    return NextResponse.json({
      success: true,
      daysOfWeek,
    });
  } catch (error) {
    console.error(
      "GET operating slot days error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load available days.",
      },
      {
        status: 500,
      }
    );
  }
}