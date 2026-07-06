import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

function isToday(date: Date) {
  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          reason: "BOOKING_ID_REQUIRED",
          message: "Booking id is required.",
        },
        { status: 400 }
      );
    }

    const booking = await prisma.slotBooking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        member: true,
        slot: true,
        package: true,
        branch: true,
        subscription: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          reason: "NOT_FOUND",
          message: "Invalid QR Code.",
        },
        { status: 404 }
      );
    }

    /**
     * Booking must be for today
     */

    if (!isToday(booking.bookingDate)) {
      return NextResponse.json(
        {
          success: false,
          reason: "INVALID_DATE",
          message: "Booking is not valid today.",
        },
        { status: 400 }
      );
    }

    /**
     * Subscription
     */

    if (booking.subscription.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          reason: "SUBSCRIPTION_EXPIRED",
          message: "Membership has expired.",
        },
        { status: 400 }
      );
    }

    /**
     * Member blocked
     */

    if (booking.member.status === "BLOCKED") {
      return NextResponse.json(
        {
          success: false,
          reason: "BLOCKED",
          message: "Member account is blocked.",
        },
        { status: 400 }
      );
    }

    /**
     * Already scanned
     */

    if (
      booking.status === "ATTENDED" ||
      booking.checkedInAt !== null
    ) {
      return NextResponse.json(
        {
          success: false,
          reason: "ALREADY_CHECKED_IN",
          message: "Session already verified.",
          checkedInAt: booking.checkedInAt,
        },
        { status: 409 }
      );
    }

    /**
     * Mark attendance
     */

    const updatedBooking = await prisma.slotBooking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: "ATTENDED",
        checkedInAt: new Date(),
      },
      include: {
        member: true,
        slot: true,
        package: true,
        branch: true,
        subscription: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Session verified successfully.",

      booking: {
        id: updatedBooking.id,
        bookingDate: updatedBooking.bookingDate,
        checkedInAt: updatedBooking.checkedInAt,
      },

      member: {
        id: updatedBooking.member.id,
        name: updatedBooking.member.name,
        phone: updatedBooking.member.phone,
        email: updatedBooking.member.email,
        profileImage: updatedBooking.member.profileImage,
      },

      slot: {
        id: updatedBooking.slot.id,
        name: updatedBooking.slot.name,
        startTime: updatedBooking.slot.startTime,
        endTime: updatedBooking.slot.endTime,
      },

      package: {
        id: updatedBooking.package.id,
        name: updatedBooking.package.name,
      },

      subscription: {
        id: updatedBooking.subscription.id,
        endDate: updatedBooking.subscription.endDate,
      },

      branch: {
        id: updatedBooking.branch.id,
        name: updatedBooking.branch.name,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        reason: "SERVER_ERROR",
        message: "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}