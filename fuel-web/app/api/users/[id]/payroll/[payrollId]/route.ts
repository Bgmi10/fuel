import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      payrollId: string;
    }>;
  }
) {
  try {
    const { payrollId } =
      await params;

    const body = await req.json();

    const payroll =
      await prisma.payroll.update({
        where: {
          id: payrollId,
        },
        data: {
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
          "Failed to update payroll",
      },
      { status: 500 }
    );
  }
}