import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { month, year } = await req.json();

    if (!month || !year) {
      return NextResponse.json(
        {
          success: false,
          message: "Month and year required",
        },
        { status: 400 }
      );
    }

    const employees =
      await prisma.employee.findMany({
        include: {
          attendances: true,
        },
      });

    let generatedCount = 0;

    for (const employee of employees) {
      const existingPayroll =
        await prisma.payroll.findFirst({
          where: {
            employeeId: employee.id,
            month: Number(month),
            year: Number(year),
          },
        });

      if (existingPayroll) {
        continue;
      }

      const attendance =
        employee.attendances.filter(
          (attendance) => {
            const date = new Date(
              attendance.date
            );

            return (
              date.getMonth() + 1 ===
                Number(month) &&
              date.getFullYear() ===
                Number(year)
            );
          }
        );

      const presentDays =
        attendance.filter(
          (attendance) =>
            attendance.status ===
            "PRESENT"
        ).length;

      const absentDays =
        attendance.filter(
          (attendance) =>
            attendance.status ===
            "ABSENT"
        ).length;

      const halfDays =
        attendance.filter(
          (attendance) =>
            attendance.status ===
            "HALFDAY"
        ).length;

      const leaveDays =
        attendance.filter(
          (attendance) =>
            attendance.status ===
            "LEAVE"
        ).length;

      const totalAttendanceDays =
        presentDays +
        absentDays +
        halfDays +
        leaveDays;

      if (totalAttendanceDays === 0) {
        continue;
      }

      const basicSalary =
        ((employee?.basicSalary ?? 0) / 100);

      const perDaySalary =
        basicSalary /
        totalAttendanceDays;

      const absentDeduction =
        Math.round(
          absentDays * perDaySalary
        );

      const halfDayDeduction =
        Math.round(
          halfDays *
            (perDaySalary / 2)
        );

      const totalDeduction =
        absentDeduction +
        halfDayDeduction;

      const netSalary =
        basicSalary -
        totalDeduction;

      await prisma.payroll.create({
        data: {
          month: Number(month),

          year: Number(year),

          employeeId: employee.id,

          basicSalary,

          incentive: 0,

          deduction:
            totalDeduction,

          advanceDeduction: 0,

          netSalary,

          paidMethod: "CASH",
        },
      });

      generatedCount++;
    }

    return NextResponse.json({
      success: true,
      count: generatedCount,
      message:
        "Payroll generated successfully",
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to generate payroll",
      },
      { status: 500 }
    );
  }
}