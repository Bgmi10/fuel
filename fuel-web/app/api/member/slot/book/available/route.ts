import { getMemberFromRequest } from "@/app/utils/memberAuth";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const member = await getMemberFromRequest(req);

    if (!member) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;

    const subscriptionId =
      searchParams.get("subscriptionId");

    const bookingDate =
      searchParams.get("bookingDate");

    if (!subscriptionId || !bookingDate) {
      return NextResponse.json(
        {
          error:
            "subscriptionId and bookingDate are required",
        },
        { status: 400 }
      );
    }

    const subscription =
      await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          memberId: member.id,
          status: "ACTIVE",
        },
      });

      const bookingDateString = new Date(
        bookingDate
      )
        .toISOString()
        .split("T")[0];

    if (!subscription) {
      return NextResponse.json(
        {
          error: "Subscription not found",
        },
        { status: 404 }
      );
    }

    const date = new Date(bookingDate);

    const slots = await prisma.slot.findMany({
      where: {
        branchId: subscription.branchId,
        packageId: subscription.packageId,
        isActive: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const slotIds = slots.map(
      (slot) => slot.id
    );

    const startOfDay = new Date(date);
startOfDay.setHours(0, 0, 0, 0);

const endOfDay = new Date(date);
endOfDay.setHours(23, 59, 59, 999);

const bookings =
  await prisma.slotBooking.groupBy({
    by: ["slotId"],
    where: {
      slotId: {
        in: slotIds,
      },
      bookingDay: bookingDateString,
      status: {
        in: ["BOOKED", "ATTENDED"],
      },
    },
    _count: {
      id: true,
    },
  });
    const slotsWithAvailability =
      slots.map((slot) => {
        const booking =
          bookings.find(
            (b) => b.slotId === slot.id
          );

        const booked =
          booking?._count.id ?? 0;

        return {
          ...slot,
          booked,
          available:
            slot.capacity - booked,
          isFull:
            booked >= slot.capacity,
        };
      });

    return NextResponse.json(
      slotsWithAvailability
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Failed to fetch available slots",
      },
      { status: 500 }
    );
  }
}