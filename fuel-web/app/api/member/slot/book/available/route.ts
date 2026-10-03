import { getMemberFromRequest } from "@/app/utils/memberAuth";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  SlotBookingEnum,
  SlotWeekday,
} from "@prisma/client";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    const member = await getMemberFromRequest(req);

    if (!member) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const searchParams = req.nextUrl.searchParams;

    const subscriptionId =
      searchParams.get("subscriptionId")?.trim();

    const rawBookingDate =
      searchParams.get("bookingDate")?.trim();

    if (!subscriptionId || !rawBookingDate) {
      return NextResponse.json(
        {
          error:
            "subscriptionId and bookingDate are required",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Supports:
     * 2026-07-16
     * 2026-07-16T00:00:00.000Z
     */
    const bookingDay = rawBookingDate.split("T")[0];

    if (!DATE_PATTERN.test(bookingDay)) {
      return NextResponse.json(
        {
          error: "Invalid booking date",
        },
        {
          status: 400,
        }
      );
    }

    const bookingDayStart = new Date(
      `${bookingDay}T00:00:00.000Z`
    );

    const bookingDayEnd = new Date(
      `${bookingDay}T23:59:59.999Z`
    );

    if (
      Number.isNaN(bookingDayStart.getTime()) ||
      Number.isNaN(bookingDayEnd.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Invalid booking date",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Calculate weekday from the booking date.
     */
    const bookingDateObject = new Date(
      `${bookingDay}T12:00:00.000Z`
    );

    const javascriptDay =
      bookingDateObject.getUTCDay();

    const JAVASCRIPT_DAY_TO_SLOT_DAY: Record<
      number,
      SlotWeekday
    > = {
      0: SlotWeekday.SUNDAY,
      1: SlotWeekday.MONDAY,
      2: SlotWeekday.TUESDAY,
      3: SlotWeekday.WEDNESDAY,
      4: SlotWeekday.THURSDAY,
      5: SlotWeekday.FRIDAY,
      6: SlotWeekday.SATURDAY,
    };

    const bookingWeekday =
      JAVASCRIPT_DAY_TO_SLOT_DAY[javascriptDay];

    /*
     * Verify:
     * - subscription belongs to member
     * - subscription is ACTIVE
     * - selected date is within subscription validity
     */
    const subscription =
      await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          memberId: member.id,
          status: "ACTIVE",

          startDate: {
            lte: bookingDayEnd,
          },

          endDate: {
            gte: bookingDayStart,
          },
        },

        select: {
          id: true,
          branchId: true,
          packageId: true,
          subCategoryId: true,

          package: {
            select: {
              serviceId: true,
            },
          },

          subCategory: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      });

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "Subscription not found or is not valid for the selected date",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Find active slots belonging to:
     * - subscription branch
     * - subscription package service
     * - subscription sub-category
     * - selected weekday
     */
    const slots = await prisma.slot.findMany({
      where: {
        branchId: subscription.branchId,

        serviceId:
          subscription.package.serviceId,

        isActive: true,

        subCategoryId:
          subscription.subCategoryId,

        daysOfWeek: {
          has: bookingWeekday,
        },
      },

      include: {
        subCategory: true,

        branch: {
          select: {
            id: true,
            name: true,
          },
        },

        service: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        startTime: "asc",
      },
    });

    if (slots.length === 0) {
      return NextResponse.json([]);
    }

    /*
     * ============================================================
     * 24-HOUR BOOKING RULE
     * ============================================================
     *
     * Booking is allowed only when the session starts
     * at least 24 hours from the current time.
     *
     * Example:
     *
     * Current time: 2026-07-15 10:00
     *
     * Session:      2026-07-16 10:00
     * -> Allowed
     *
     * Session:      2026-07-16 09:59
     * -> Not allowed
     *
     * IMPORTANT:
     * This assumes slot.startTime is stored as "HH:mm"
     * or "HH:mm:ss".
     */

    const now = new Date();

    const minimumBookingTime =
      new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      );

    const slotsWithinBookingWindow =
      slots.filter((slot) => {
        /*
         * Convert slot.startTime into a session
         * datetime for the selected booking day.
         *
         * Example:
         * bookingDay = "2026-07-16"
         * startTime  = "10:30"
         *
         * sessionStart =
         * 2026-07-16T10:30:00.000Z
         */

        const startTime = String(
          slot.startTime
        ).trim();

        const sessionStart = new Date(
          `${bookingDay}T${startTime}:00.000Z`
        );

        /*
         * Ignore invalid slot times.
         */
        if (
          Number.isNaN(
            sessionStart.getTime()
          )
        ) {
          return false;
        }

        /*
         * Session must be >= 24 hours from now.
         */
        return (
          sessionStart.getTime() >=
          minimumBookingTime.getTime()
        );
      });

    if (
      slotsWithinBookingWindow.length === 0
    ) {
      return NextResponse.json([]);
    }

    /*
     * Get slot IDs only after applying
     * the 24-hour restriction.
     */
    const slotIds =
      slotsWithinBookingWindow.map(
        (slot) => slot.id
      );

    /*
     * Count bookings separately for every slot
     * on the selected booking day.
     */
    const bookings =
      await prisma.slotBooking.groupBy({
        by: ["slotId"],

        where: {
          slotId: {
            in: slotIds,
          },

          bookingDay,

          status: {
            in: [
              SlotBookingEnum.BOOKED,
              SlotBookingEnum.ATTENDED,
            ],
          },
        },

        _count: {
          id: true,
        },
      });

    const bookingCountMap = new Map(
      bookings.map((booking) => [
        booking.slotId,
        booking._count.id,
      ])
    );

    /*
     * Add booking and availability information.
     */
    const slotsWithAvailability =
      slotsWithinBookingWindow.map(
        (slot) => {
          const booked =
            bookingCountMap.get(
              slot.id
            ) ?? 0;

          const available = Math.max(
            slot.capacity - booked,
            0
          );

          return {
            ...slot,

            booked,

            available,

            isFull:
              booked >= slot.capacity,
          };
        }
      );

    return NextResponse.json(
      slotsWithAvailability
    );
  } catch (error) {
    console.error(
      "GET available slots error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch available slots",
      },
      {
        status: 500,
      }
    );
  }
}
