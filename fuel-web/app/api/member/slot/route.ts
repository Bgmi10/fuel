import { getMemberFromRequest } from "@/app/utils/memberAuth";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    try {
        const member = await getMemberFromRequest(req)

        const [upcomingBooking, recentBookings] =
        await Promise.all([
          prisma.slotBooking.findFirst({
            where: {
              memberId: member?.id,
              status: "BOOKED",
              bookingDate: {
                gte: new Date(
                  new Date().setHours(0, 0, 0, 0)
                )
              }
            },
            include: {
              slot: true,
              subscription: true,
              branch: true,
              package: true
            },
            orderBy: {
              bookingDate: "asc"
            }
          }),
      
          prisma.slotBooking.findMany({
            where: {
              memberId: member?.id
            },
            include: {
              slot: true,
              subscription: true,
              branch: true
            },
            orderBy: {
              bookingDate: "desc"
            },
            take: 5
          })
        ]);
      
      return NextResponse.json({
        upcomingBooking,
        recentBookings
      });

    } catch (e) {
        return NextResponse.json({ success: false })
    }
}