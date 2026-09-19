import { getMemberFromRequest } from "@/app/utils/memberAuth";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // =========================================================
    // AUTH
    // =========================================================

    const member = await getMemberFromRequest(req);

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // =========================================================
    // BODY
    // =========================================================

    const body = await req.json();

    const bookingId =
      typeof body.bookingId === "string"
        ? body.bookingId.trim()
        : "";

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // FIND BOOKING
    // =========================================================

    const booking = await prisma.slotBooking.findFirst({
      where: {
        id: bookingId,
        memberId: member.id,
      },
      select: {
        id: true,
        memberId: true,
        bookingDate: true,
        bookingDay: true,
        checkedInAt: true,
        status: true,

        slot: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },

        subscription: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 }
      );
    }

    // =========================================================
    // ALREADY ATTENDED
    // =========================================================

    if (booking.status === "ATTENDED") {
      return NextResponse.json(
        {
          success: false,
          message: "An attended session cannot be cancelled",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // ALREADY CHECKED IN
    // =========================================================

    if (booking.checkedInAt) {
      return NextResponse.json(
        {
          success: false,
          message: "A checked-in session cannot be cancelled",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // CHECK BOOKING DATE
    // =========================================================

    const bookingDate = new Date(booking.bookingDate);

    if (Number.isNaN(bookingDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking date",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // DON'T ALLOW CANCELLING PAST BOOKINGS
    // =========================================================

    const now = new Date();

    if (bookingDate < now) {
      return NextResponse.json(
        {
          success: false,
          message: "Past bookings cannot be cancelled",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // DELETE BOOKING
    // =========================================================

    await prisma.slotBooking.delete({
      where: {
        id: booking.id,
      },
    });

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
      bookingId: booking.id,
    });
  } catch (error) {
    console.error(
      "POST /api/member/slot/cancel error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to cancel booking",
      },
      { status: 500 }
    );
  }
}