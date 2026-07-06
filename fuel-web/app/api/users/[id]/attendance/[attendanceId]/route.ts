// app/api/users/[id]/attendance/[attendanceId]/route.ts

import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: {
    params: Promise<{
      attendanceId: string;
    }>;
  }
) {
  const { attendanceId } = await params;

  const body = await req.json();

  try {
    const attendance =
      await prisma.attendance.update({
        where: {
          id: attendanceId,
        },
        data: {
          date: body.date
            ? new Date(body.date)
            : undefined,

          status: body.status,

          checkIn: body.checkIn
            ? new Date(body.checkIn)
            : null,

          checkOut: body.checkOut
            ? new Date(body.checkOut)
            : null,
        },
      });

    return NextResponse.json({
      success: true,
      attendance,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update attendance",
      },
      { status: 500 }
    );
  }
}