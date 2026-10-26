import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

const IST = "+05:30";

// "YYYY-MM-DD" -> [start, end) of that day in Asia/Kolkata
const dayRange = (dateKey: string) => {
  const start = new Date(`${dateKey}T00:00:00.000${IST}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const date = searchParams.get("date");

  if (!memberId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "memberId and date required" }, { status: 400 });
  }

  const { start, end } = dayRange(date);

  // Range query works whether logDate was stored as IST midnight or UTC midnight.
  const foodLog = await prisma.foodLog.findFirst({
    where: { memberId, logDate: { gte: start, lt: end } },
    include: {
      meals: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  // Plan that was valid ON that date (not today's isActive plan)
  const plan = await prisma.dietPlan.findFirst({
    where: { memberId, startDate: { lt: end }, endDate: { gte: start } },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({
    data: {
      date,
      foodLog,
      activePlan: plan,
      targets: plan
        ? {
            calories: plan.targetCalories,
            protein: plan.targetProtein,
            carbs: plan.targetCarbs,
            fat: plan.targetFat,
          }
        : { calories: 0, protein: 0, carbs: 0, fat: 0 },
    },
  });
}