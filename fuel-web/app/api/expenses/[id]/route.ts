import { getSession } from "@/app/utils/auth";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        byUserId: user.id,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        {
          success: false,
          message: "Expense not found",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const amount = Number(body.amount);

    if (!description) {
      return NextResponse.json(
        {
          success: false,
          message: "Description is required",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Amount must be greater than 0",
        },
        { status: 400 }
      );
    }

    let expenseDate: Date | null = null;

    if (body.date) {
      expenseDate = new Date(`${body.date}T00:00:00.000Z`);

      if (Number.isNaN(expenseDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid date",
          },
          { status: 400 }
        );
      }
    }

    const expense = await prisma.expense.update({
      where: {
        id,
      },
      data: {
        description,
        amount: Math.round(amount),
        date: expenseDate,
      },
    });

    return NextResponse.json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error("PUT expense error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update expense",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        byUserId: user.id,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        {
          success: false,
          message: "Expense not found",
        },
        { status: 404 }
      );
    }

    await prisma.expense.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("DELETE expense error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete expense",
      },
      { status: 500 }
    );
  }
}