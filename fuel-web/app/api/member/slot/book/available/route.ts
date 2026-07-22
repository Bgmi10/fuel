import { getMemberFromRequest } from "@/app/utils/memberAuth";
import { prisma } from "@/prisma";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import { SlotBookingEnum } from "@prisma/client";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    const member =
      await getMemberFromRequest(req);

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

    const searchParams =
      req.nextUrl.searchParams;

    const subscriptionId =
      searchParams.get("subscriptionId")?.trim();

    const rawBookingDate =
      searchParams.get("bookingDate")?.trim();

    if (
      !subscriptionId ||
      !rawBookingDate
    ) {
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
     * Supports both:
     * 2026-07-16
     * 2026-07-16T00:00:00.000Z
     */
    const bookingDay =
      rawBookingDate.split("T")[0];

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
      Number.isNaN(
        bookingDayStart.getTime()
      )
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
     * Verify that:
     * - subscription belongs to member
     * - subscription is active
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
          error:
            "Subscription not found or is not valid for the selected date",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Find slots belonging to:
     * - subscription branch
     * - subscription package's service
     */
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

        include: {
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

    const slotIds = slots.map(
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

    const slotsWithAvailability =
      slots.map((slot) => {
        const booked =
          bookingCountMap.get(slot.id) ??
          0;

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
      });

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