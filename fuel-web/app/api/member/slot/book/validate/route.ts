import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      subscriptionId,
      slotId,
      bookingDate,
      memberId,
    } = await req.json();

    const subscription =
      await prisma.subscription.findUnique({
        where: {
          id: subscriptionId,
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
          valid: false,
          message: "Subscription not found",
        },
        { status: 400 }
      );
    }

    if (subscription.status !== "ACTIVE") {
      return NextResponse.json(
        {
          valid: false,
          message: "Subscription inactive",
        },
        { status: 400 }
      );
    }

    const existingBookings =
    await prisma.slotBooking.findMany({
      where: {
        memberId,
        bookingDay: bookingDateString,
        status: {
          in: ["BOOKED", "ATTENDED"],
        },
      },
      include: {
        slot: true,
      },
    });

    const slot = await prisma.slot.findUnique({
        where: {
          id: slotId,
        },
      });
  


    const newStart = slot?.startTime ?? "";
const newEnd = slot?.endTime ?? "";

const hasConflict =
  existingBookings.some((booking) => {
    const existingStart =
      booking.slot.startTime;

    const existingEnd =
      booking.slot.endTime;

    return (
      newStart < existingEnd &&
      newEnd > existingStart
    );
  });

  if (hasConflict) {
    return NextResponse.json(
      {
        valid: false,
        message:
          "You already have another session during this time",
      },
      { status: 400 }
    );
  }

  
    if (!slot || !slot.isActive) {
      return NextResponse.json(
        {
          valid: false,
          message: "Slot unavailable",
        },
        { status: 400 }
      );
    }

    const bookingCount =
      await prisma.slotBooking.count({
        where: {
          slotId,
          bookingDay: bookingDateString,
        },
      });

    if (bookingCount >= slot.capacity) {
      return NextResponse.json(
        {
          valid: false,
          message: "Slot is full",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        valid: false,
        message: "Validation failed",
      },
      { status: 500 }
    );
  }
}