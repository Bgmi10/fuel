import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const payroll =
      await prisma.payroll.create({
        data: {
          employeeId: body.employeeId,

          month: Number(body.month),

          year: Number(body.year),

          basicSalary: Number(
            body.basicSalary
          ),

          incentive: Number(
            body.incentive || 0
          ),

          deduction: Number(
            body.deduction || 0
          ),

          advanceDeduction: Number(
            body.advanceDeduction || 0
          ),

          netSalary: Number(
            body.netSalary
          ),

          paidMethod: body.paidMethod,
        },
      });

    return NextResponse.json({
      success: true,
      payroll,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create payroll",
      },
      { status: 500 }
    );
  }
}