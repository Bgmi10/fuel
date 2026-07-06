import { prisma } from "@/prisma";
import { AttendanceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    try {
        const today = new Date();

today.setHours(0, 0, 0, 0);

const tomorrow = new Date(today);

tomorrow.setDate(
  tomorrow.getDate() + 1
);

const attendance =
  await prisma.attendance.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      employeeId: true,
    },
  });

const existingEmployeeIds =
  attendance.map(
    (item) => item.employeeId
  );

const users =
  await prisma.employee.findMany({
    where: {
      id: {
        notIn: existingEmployeeIds,
      },
    },
    include: {
      user: true,
    },
  });

return NextResponse.json({
  users,
  success: true
});
    } catch (e) {
        console.log(e);
        
return NextResponse.json({
    success: false
  });
    }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payload",
        },
        { status: 400 }
      );
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const existingAttendance =
      await prisma.attendance.findMany({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
        select: {
          employeeId: true,
        },
      });

    const existingEmployeeIds =
      existingAttendance.map(
        (item) => item.employeeId
      );

    const attendanceToCreate =
      body.filter(
        (item: {
          employeeId: string;
          status: string;
        }) =>
          !existingEmployeeIds.includes(
            item.employeeId
          )
      );

    if (
      attendanceToCreate.length === 0
    ) {
      return NextResponse.json({
        success: false,
        message:
          "Attendance already completed for today",
      });
    }

    await prisma.attendance.createMany({
      data: attendanceToCreate.map(
        (item: {
          employeeId: string;
          status: AttendanceStatus;
        }) => ({
          employeeId: item.employeeId,
          date: today,
          status: item.status,
        })
      ),
    });

    return NextResponse.json({
      success: true,
      message:
        "Attendance saved successfully",
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to save attendance",
      },
      { status: 500 }
    );
  }
}