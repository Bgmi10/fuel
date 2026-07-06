import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export const PUT = async (
  req: NextRequest,
  { params }: Params
) => {
  try {
    const { id } = await params;

    const {
      bankName,
      accountNo,
      ifscCode,
      salaryType,
      basicSalary,
    } = await req.json();

    const updateData: any = {};

    if (bankName !== undefined) {
      updateData.bankName = bankName;
    }

    if (accountNo !== undefined) {
      updateData.accountNo = accountNo;
    }

    if (ifscCode !== undefined) {
      updateData.ifscCode = ifscCode;
    }

    if (salaryType !== undefined) {
      updateData.salaryType = salaryType;
    }

    if (basicSalary !== undefined) {
      updateData.basicSalary = Number(basicSalary * 100);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        employee: {
           upsert: {
            create: {
                bankName,
                accountNo,
                basicSalary: basicSalary * 100,
                ifscCode,
                salaryType
            },
            update: updateData
           }
        }
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update user",
      },
      { status: 500 }
    );
  }
};