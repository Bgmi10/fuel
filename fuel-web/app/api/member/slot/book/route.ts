import { getMemberFromRequest } from "@/app/utils/memberAuth";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const member = await getMemberFromRequest(req);

    if (!member) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      subscriptionId,
      slotId,
      bookingDate,
    } = await req.json();

    if (
      !subscriptionId ||
      !slotId ||
      !bookingDate
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }
    const date = new Date(bookingDate);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);


    
    const bookingDateString = new Date(
        bookingDate
      )
        .toISOString()
        .split("T")[0];

    // Verify subscription belongs to member
    const subscription =
      await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          memberId: member.id,
          status: "ACTIVE",
          endDate: {
            gte: new Date(),
          },
        },
      });

    if (!subscription) {
      return NextResponse.json(
        {
          error: "Invalid subscription",
        },
        { status: 400 }
      );
    }
    // Verify slot
    const slot = await prisma.slot.findUnique({
      where: {
        id: slotId,
      },
    });

    const conflictingBooking =
  await prisma.slotBooking.findFirst({
    where: {
      memberId: member.id,
      bookingDay: bookingDateString,
      status: {
        in: ["BOOKED", "ATTENDED"],
      },
      slot: {
        startTime: slot?.startTime,
      },
    },
  });

if (conflictingBooking) {
  return NextResponse.json(
    {
      error:
        "You already have another booking during this time",
    },
    { status: 400 }
  );
}

    if (!slot) {
      return NextResponse.json(
        {
          error: "Slot not found",
        },
        { status: 404 }
      );
    }

    // Ensure slot matches subscription
    if (
      slot.branchId !==
        subscription.branchId ||
      slot.packageId !==
        subscription.packageId
    ) {
      return NextResponse.json(
        {
          error:
            "Slot does not belong to selected membership",
        },
        { status: 400 }
      );
    }

    // Capacity check
    const bookedCount =
  await prisma.slotBooking.count({
    where: {
      slotId,
      bookingDay: bookingDateString,
      status: {
        in: ["BOOKED", "ATTENDED"],
      },
    },
  });

    if (
      bookedCount >= slot.capacity
    ) {
      return NextResponse.json(
        {
          error:
            "This slot is already full",
        },
        { status: 400 }
      );
    }


    const booking =
      await prisma.slotBooking.create({
        data: {
          memberId: member.id,
          subscriptionId:
            subscription.id,
          slotId,
          bookingDay: bookingDateString,
          branchId:
            subscription.branchId,
          packageId:
            subscription.packageId,
          bookingDate: date,
          status: "BOOKED",
        },
      });

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to create booking",
      },
      { status: 500 }
    );
  }
}