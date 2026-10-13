import { getSession } from "@/app/utils/auth";
import { prisma } from "@/prisma";
import { ExpenseType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const EXPENSE_TYPES = Object.values(ExpenseType) as string[];

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const expenses = await prisma.expense.findMany({
      where: {
        byUserId: user.id,

        ...(from || to
          ? {
              date: {
                ...(from
                  ? { gte: new Date(`${from}T00:00:00.000Z`) }
                  : {}),
                ...(to
                  ? { lte: new Date(`${to}T23:59:59.999Z`) }
                  : {}),
              },
            }
          : {}),
      },

      // IMPORTANT: never `include: { byUser: true }` here, that sends
      // the user's password hash to the browser.
      include: {
        byUser: {
          select: { id: true, name: true },
        },
      },

      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const total = expenses.reduce(
      (sum, expense) => sum + (expense.amount ?? 0),
      0
    );

    return NextResponse.json({
      success: true,
      expenses,
      summary: {
        total,
        count: expenses.length,
      },
    });
  } catch (error) {
    console.error("GET expenses error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    const amount = Number(body.amount);

    if (!description) {
      return NextResponse.json(
        { success: false, message: "Description is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Type of expense: optional in the API (defaults to OTHER),
    // but if it is sent it must be a valid value.
    let expenseType: ExpenseType = ExpenseType.OTHER;

    if (
      body.expenseType !== undefined &&
      body.expenseType !== null &&
      body.expenseType !== ""
    ) {
      if (!EXPENSE_TYPES.includes(body.expenseType)) {
        return NextResponse.json(
          { success: false, message: "Invalid expense type" },
          { status: 400 }
        );
      }

      expenseType = body.expenseType as ExpenseType;
    }

    let expenseDate: Date | null = null;

    if (body.date) {
      expenseDate = new Date(`${body.date}T00:00:00.000Z`);

      if (Number.isNaN(expenseDate.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid date" },
          { status: 400 }
        );
      }
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        expenseType,
        amount: Math.round(amount),
        date: expenseDate,
        byUserId: user.id,
      },
    });

    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    console.error("POST expense error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create expense" },
      { status: 500 }
    );
  }
}