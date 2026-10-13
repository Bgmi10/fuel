import { getUserFromRequest } from "@/app/utils/auth";
import { prisma } from "@/prisma";
import { MembershipUsageType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const allowedRoles = new Set(["ADMIN", "MANAGER", "STAFF"]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 92;
const MAX_ROWS = 5000;
const LOW_SESSIONS = 2;

const USAGE_TYPES = ["DURATION_BASED", "SESSION_BASED"];

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
        {
          success: false,
          message: "You do not have permission to view attendance.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const get = (key: string) => searchParams.get(key)?.trim() || "";

    const today = todayKey();
    const from = get("from") || today;
    const to = get("to") || from;

    const search = get("search");
    const requestedBranchId = get("branchId");
    const serviceId = get("serviceId");
    const packageId = get("packageId");
    const slotId = get("slotId");
    const usageType = get("usageType");
    const deducted = get("deducted"); // "" | "yes" | "no"
    const lowSessions = get("lowSessions") === "true";

    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      return NextResponse.json(
        { success: false, message: "Dates must be in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    if (to < from) {
      return NextResponse.json(
        {
          success: false,
          message: "End date cannot be before the start date.",
        },
        { status: 400 }
      );
    }

    if (daysBetween(from, to) > MAX_RANGE_DAYS) {
      return NextResponse.json(
        {
          success: false,
          message: `Please choose a range of ${MAX_RANGE_DAYS} days or less.`,
        },
        { status: 400 }
      );
    }

    /**
     * Branch access: a branch-bound user is locked to their branch,
     * the same way the Collection and Invoice pages work.
     */
    const appliedBranchId =
      user.branchId ||
      (requestedBranchId && requestedBranchId !== "ALL"
        ? requestedBranchId
        : null);

    /**
     * Every filter EXCEPT the date range. The "Today" card uses this,
     * so it responds to the other filters but never to the date range.
     */
    const baseAnd: Prisma.MemberAttendanceWhereInput[] = [];

    if (appliedBranchId) baseAnd.push({ branchId: appliedBranchId });

    if (serviceId && serviceId !== "ALL") {
      baseAnd.push({ subscription: { package: { serviceId } } });
    }

    if (packageId) baseAnd.push({ subscription: { packageId } });

    if (USAGE_TYPES.includes(usageType)) {
      baseAnd.push({
        subscription: { usageType: usageType as MembershipUsageType },
      });
    }

    if (lowSessions) {
      baseAnd.push({
        subscription: {
          usageType: "SESSION_BASED",
          remainingSessions: { lte: LOW_SESSIONS },
        },
      });
    }

    if (slotId) {
      baseAnd.push({
        OR: [{ slotId }, { slotBooking: { slotId } }],
      });
    }

    if (deducted === "yes") baseAnd.push({ sessionDeducted: true });
    if (deducted === "no") baseAnd.push({ sessionDeducted: false });

    if (search) {
      baseAnd.push({
        OR: [
          { member: { name: { contains: search, mode: "insensitive" } } },
          { member: { phone: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    const where: Prisma.MemberAttendanceWhereInput = {
      AND: [...baseAnd, { dateKey: { gte: from, lte: to } }],
    };

    const todayWhere: Prisma.MemberAttendanceWhereInput = {
      AND: [...baseAnd, { dateKey: today }],
    };

    const [
      rows,
      branches,
      services,
      packages,
      slots,
      todayTotal,
      todayTotalMembers,
    ] = await Promise.all([
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
        where: user.branchId ? { id: user.branchId } : undefined,
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),

      prisma.service.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),

      prisma.servicePackage.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, serviceId: true },
      }),

      prisma.slot.findMany({
        where: user.branchId ? { branchId: user.branchId } : undefined,
        orderBy: [{ name: "asc" }, { startTime: "asc" }],
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true,
          branchId: true,
          serviceId: true,
          branch: { select: { name: true } },
        },
      }),

      // Today card
      prisma.memberAttendance.count({ where: todayWhere }),

      prisma.memberAttendance
        .groupBy({ by: ["memberId"], where: todayWhere })
        .then((groups) => groups.length),
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

    /* ---------------- SUMMARY (current view) ---------------- */

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
      today,
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

      todayStats: {
        total: { count: todayTotal, uniqueMembers: todayTotalMembers },
      },

      filters: {
        branches,
        services,
        packages,
        slots: slots.map((slot) => ({
          id: slot.id,
          name: slot.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          branchId: slot.branchId,
          serviceId: slot.serviceId,
          branchName: slot.branch.name,
        })),
      },

      scope: {
        branchId: appliedBranchId,
        canSelectBranch: !user.branchId,
      },
    });
  } catch (error) {
    console.error("Attendance list error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load attendance." },
      { status: 500 }
    );
  }
}