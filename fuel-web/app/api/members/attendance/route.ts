import { getUserFromRequest } from "@/app/utils/auth";
import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const allowedRoles = new Set(["ADMIN", "MANAGER", "STAFF"]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 92;
const MAX_ROWS = 5000;

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysBetween(from: string, to: string) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86400000) + 1;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    if (!user.role || !allowedRoles.has(user.role)) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view attendance." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const today = todayKey();
    const from = searchParams.get("from") || today;
    const to = searchParams.get("to") || from;
    const branchId = searchParams.get("branchId");
    const serviceId = searchParams.get("serviceId");

    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      return NextResponse.json(
        { success: false, message: "Dates must be in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    if (to < from) {
      return NextResponse.json(
        { success: false, message: "End date cannot be before the start date." },
        { status: 400 }
      );
    }

    if (daysBetween(from, to) > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { success: false, message: `Please choose a range of ${MAX_RANGE_DAYS} days or less.` },
        { status: 400 }
      );
    }

    const where: Prisma.MemberAttendanceWhereInput = {
      dateKey: { gte: from, lte: to },
      ...(branchId && branchId !== "ALL" ? { branchId } : {}),
      ...(serviceId && serviceId !== "ALL"
        ? { subscription: { package: { serviceId } } }
        : {}),
    };

    const [rows, branches, services] = await Promise.all([
      prisma.memberAttendance.findMany({
        where,
        orderBy: { checkInAt: "desc" },
        take: MAX_ROWS + 1,
        include: {
          member: {
            select: { id: true, name: true, phone: true, profileImage: true },
          },
          branch: { select: { id: true, name: true } },
          subscription: {
            select: {
              id: true,
              packageName: true,
              serviceName: true,
              usageType: true,
              totalSessions: true,
              remainingSessions: true,
              endDate: true,
            },
          },
          slotBooking: {
            select: {
              slot: { select: { name: true, startTime: true, endTime: true } },
            },
          },
        },
      }),

      prisma.branch.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),

      prisma.service.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
    ]);

    const truncated = rows.length > MAX_ROWS;
    const limited = truncated ? rows.slice(0, MAX_ROWS) : rows;

    const records = limited.map((row) => ({
      id: row.id,
      checkInAt: row.checkInAt,
      dateKey: row.dateKey,
      sessionDeducted: row.sessionDeducted,
      member: row.member,
      branch: row.branch,
      subscription: row.subscription,
      slot: row.slotBooking?.slot ?? null,
    }));

    /* ---------------- SUMMARY ---------------- */

    const byDay = new Map<string, number>();
    const bySlot = new Map<string, number>();
    const members = new Set<string>();
    let sessionsDeducted = 0;

    for (const record of records) {
      byDay.set(record.dateKey, (byDay.get(record.dateKey) ?? 0) + 1);
      members.add(record.member.id);

      if (record.sessionDeducted) sessionsDeducted += 1;

      if (record.slot) {
        const label = `${record.slot.name} (${record.slot.startTime})`;
        bySlot.set(label, (bySlot.get(label) ?? 0) + 1);
      }
    }

    const topSlot =
      [...bySlot.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    return NextResponse.json({
      success: true,
      range: { from, to },
      truncated,
      records,
      summary: {
        totalCheckIns: records.length,
        uniqueMembers: members.size,
        sessionsDeducted,
        topSlot: topSlot ? { label: topSlot[0], count: topSlot[1] } : null,
        byDay: [...byDay.entries()]
          .map(([dateKey, count]) => ({ dateKey, count }))
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
      },
      filters: { branches, services },
    });
  } catch (error) {
    console.error("Attendance list error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load attendance." },
      { status: 500 }
    );
  }
}