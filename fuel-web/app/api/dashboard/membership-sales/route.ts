import {
  InvoiceIntent,
  InvoicePaymentStatus,
  InvoiceStatus,
  MemberStatus,
  Prisma,
  SubscriptionStatus,
} from "@prisma/client";

import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/app/utils/auth";
import { prisma } from "@/prisma";

import {
  addDaysToDateKey,
  diffDays,
  getChartKeys,
  getIndiaDateKey,
  getWeekStartKey,
  indiaDayEndToUtc,
  indiaDayStartToUtc,
  invoiceTotalPaise,
  parsePeriod,
  resolveDateRange,
  toDateKey,
} from "@/src/lib/dashboard-range";

export const dynamic = "force-dynamic";

const EXPIRY_DAYS = 7;
const EXPIRY_PAGE_SIZE = 5;
const BIRTHDAY_DAYS = 28;
/** Overdue = expired within this many days, and not renewed since. */
const OVERDUE_LOOKBACK_DAYS = 60;

const getNextBirthdayDate = (dob: string, todayKey: string) => {
  const [, month, day] = dob.split("-").map(Number);

  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const [year] = todayKey.split("-").map(Number);

  let birthdayKey = toDateKey(year, month, day);

  if (birthdayKey < todayKey) {
    birthdayKey = toDateKey(year + 1, month, day);
  }

  return birthdayKey;
};

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const sp = req.nextUrl.searchParams;

    /* ---------------- PERIODS (three independent filters) ---------------- */

    const financialPeriod = parsePeriod(sp.get("period"), "month");
    const chartPeriod = parsePeriod(sp.get("chartPeriod"), "month");
    const salesPeriod = parsePeriod(sp.get("salesPeriod"), "month");

    if (!financialPeriod || !chartPeriod || !salesPeriod) {
      return NextResponse.json(
        { success: false, message: "Invalid period." },
        { status: 400 }
      );
    }

    const financialRange = resolveDateRange({
      period: financialPeriod,
      from: sp.get("from"),
      to: sp.get("to"),
    });

    const chartRange = resolveDateRange({
      period: chartPeriod,
      from: sp.get("chartFrom"),
      to: sp.get("chartTo"),
    });

    const salesRange = resolveDateRange({
      period: salesPeriod,
      from: sp.get("salesFrom"),
      to: sp.get("salesTo"),
    });

    /* ---------------- BRANCH ---------------- */

    const requestedBranchId = sp.get("branchId")?.trim() || null;
    const appliedBranchId = user.branchId || requestedBranchId || null;

    if (!user.branchId && requestedBranchId) {
      const exists = await prisma.branch.findUnique({
        where: { id: requestedBranchId },
        select: { id: true },
      });

      if (!exists) {
        return NextResponse.json(
          { success: false, message: "Selected branch was not found." },
          { status: 404 }
        );
      }
    }

    const branchFilter = appliedBranchId ? { branchId: appliedBranchId } : {};

    /* ---------------- DATES ---------------- */

    const todayKey = getIndiaDateKey();
    const todayStart = indiaDayStartToUtc(todayKey);
    const todayEnd = indiaDayEndToUtc(todayKey);

    const weekStart = indiaDayStartToUtc(getWeekStartKey(todayKey));
    const monthStart = indiaDayStartToUtc(`${todayKey.slice(0, 8)}01`);

    const expiryEnd = indiaDayEndToUtc(
      addDaysToDateKey(todayKey, EXPIRY_DAYS)
    );

    const overdueStart = indiaDayStartToUtc(
      addDaysToDateKey(todayKey, -OVERDUE_LOOKBACK_DAYS)
    );

    const birthdayEndKey = addDaysToDateKey(todayKey, BIRTHDAY_DAYS);

    /* ---------------- EXPIRY TAB + PAGE ---------------- */

    const expiryTab =
      sp.get("expiryTab") === "overdue" ? "overdue" : "upcoming";

    const requestedExpiryPage = Math.floor(
      Number(sp.get("expiryPage") || "1")
    );

    const expiryPage =
      Number.isFinite(requestedExpiryPage) && requestedExpiryPage >= 1
        ? requestedExpiryPage
        : 1;

    const liveStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.FROZEN,
    ];

    const upcomingWhere: Prisma.SubscriptionWhereInput = {
      endDate: { gte: todayStart, lte: expiryEnd },
      status: { in: liveStatuses },
      ...branchFilter,
      member: { status: MemberStatus.ACTIVE },
    };

    const overdueWhere: Prisma.SubscriptionWhereInput = {
      endDate: { gte: overdueStart, lt: todayStart },
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED],
      },
      ...branchFilter,
      member: {
        status: MemberStatus.ACTIVE,
        // renewed members are not overdue
        subscriptions: {
          none: {
            status: { in: liveStatuses },
            endDate: { gte: todayStart },
          },
        },
      },
    };

    const paidWhere = {
      status: InvoicePaymentStatus.PAID,
      invoice: appliedBranchId ? { branchId: appliedBranchId } : undefined,
    };

    const expenseBranch = appliedBranchId
      ? { byUser: { branchId: appliedBranchId } }
      : {};

    /* ---------------- QUERIES ---------------- */

    const [
      activeMembers,
      newMembers,
      todayPlanExpiry,
      presentGroups,
      todayCollection,
      weekCollection,
      pendingDue,
      monthRenewals,
      financialCollection,
      financialExpenses,
      chartPayments,
      chartExpenses,
      salesInvoices,
      upcomingTotal,
      overdueTotal,
      expirySubscriptions,
      birthdayMembers,
      branches,
    ] = await Promise.all([
      prisma.member.count({
        where: {
          status: MemberStatus.ACTIVE,
          ...branchFilter,
          subscriptions: {
            some: {
              status: SubscriptionStatus.ACTIVE,
              endDate: { gte: todayStart },
            },
          },
        },
      }),

      prisma.member.count({
        where: {
          createdAt: { gte: monthStart, lte: todayEnd },
          ...branchFilter,
        },
      }),

      prisma.subscription.count({
        where: {
          endDate: { gte: todayStart, lte: todayEnd },
          status: { in: liveStatuses },
          ...branchFilter,
        },
      }),

      // distinct members checked in today
      prisma.memberAttendance.groupBy({
        by: ["memberId"],
        where: { dateKey: todayKey, ...branchFilter },
      }),

      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...paidWhere, paidAt: { gte: todayStart, lte: todayEnd } },
      }),

      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...paidWhere, paidAt: { gte: weekStart, lte: todayEnd } },
      }),

      prisma.invoice.aggregate({
        _sum: { balanceAmount: true },
        where: {
          status: {
            in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL_PAID],
          },
          balanceAmount: { gt: 0 },
          ...branchFilter,
        },
      }),

      prisma.invoice.count({
        where: {
          intent: InvoiceIntent.EXTEND,
          status: {
            in: [InvoiceStatus.PARTIAL_PAID, InvoiceStatus.FULLY_PAID],
          },
          payments: {
            some: {
              status: InvoicePaymentStatus.PAID,
              paidAt: { gte: monthStart, lte: todayEnd },
            },
          },
          ...branchFilter,
        },
      }),

      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          ...paidWhere,
          paidAt: {
            gte: financialRange.startDate,
            lte: financialRange.endDate,
          },
        },
      }),

      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          date: {
            gte: financialRange.startDate,
            lte: financialRange.endDate,
          },
          ...expenseBranch,
        },
      }),

      prisma.payment.findMany({
        where: {
          ...paidWhere,
          paidAt: { gte: chartRange.startDate, lte: chartRange.endDate },
        },
        select: { amount: true, paidAt: true },
      }),

      prisma.expense.findMany({
        where: {
          date: { gte: chartRange.startDate, lte: chartRange.endDate },
          ...expenseBranch,
        },
        select: { amount: true, date: true },
      }),

      prisma.invoice.findMany({
        where: {
          intent: {
            in: [
              InvoiceIntent.NEW,
              InvoiceIntent.EXTEND,
              InvoiceIntent.UPGRADE,
            ],
          },
          status: { not: InvoiceStatus.CANCELLED },
          createdAt: { gte: salesRange.startDate, lte: salesRange.endDate },
          ...branchFilter,
        },
        select: {
          finalAmount: true,
          totalTax: true,
          discountAmount: true,
          createdAt: true,
        },
      }),

      prisma.subscription.count({ where: upcomingWhere }),
      prisma.subscription.count({ where: overdueWhere }),

      prisma.subscription.findMany({
        where: expiryTab === "overdue" ? overdueWhere : upcomingWhere,
        select: {
          id: true,
          serviceName: true,
          packageName: true,
          startDate: true,
          endDate: true,
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              profileImage: true,
            },
          },
        },
        orderBy: [
          { endDate: expiryTab === "overdue" ? "desc" : "asc" },
          { member: { name: "asc" } },
        ],
        skip: (expiryPage - 1) * EXPIRY_PAGE_SIZE,
        take: EXPIRY_PAGE_SIZE,
      }),

      prisma.member.findMany({
        where: {
          dob: { not: null },
          status: MemberStatus.ACTIVE,
          ...branchFilter,
        },
        select: { id: true, name: true, dob: true, profileImage: true },
      }),

      prisma.branch.findMany({
        where: user.branchId ? { id: user.branchId } : undefined,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    /* ---------------- COLLECTION / EXPENSE TREND ---------------- */

    const chartMap = new Map<
      string,
      { date: string; collectionPaise: number; expensesPaise: number }
    >();

    for (const date of getChartKeys(chartRange.fromKey, chartRange.toKey)) {
      chartMap.set(date, { date, collectionPaise: 0, expensesPaise: 0 });
    }

    for (const payment of chartPayments) {
      const row = chartMap.get(getIndiaDateKey(payment.paidAt));
      if (row) row.collectionPaise += payment.amount;
    }

    for (const expense of chartExpenses) {
      if (!expense.date) continue;
      const row = chartMap.get(getIndiaDateKey(expense.date));
      if (row) row.expensesPaise += expense.amount || 0;
    }

    /* ---------------- SALES TREND ---------------- */

    const salesMap = new Map<
      string,
      { date: string; salesPaise: number; count: number }
    >();

    for (const date of getChartKeys(salesRange.fromKey, salesRange.toKey)) {
      salesMap.set(date, { date, salesPaise: 0, count: 0 });
    }

    let salesTotalPaise = 0;

    for (const invoice of salesInvoices) {
      const total = invoiceTotalPaise(invoice);
      const row = salesMap.get(getIndiaDateKey(invoice.createdAt));

      salesTotalPaise += total;

      if (row) {
        row.salesPaise += total;
        row.count += 1;
      }
    }

    /* ---------------- BIRTHDAYS ---------------- */

    const upcomingBirthdays = birthdayMembers
      .map((member) => {
        if (!member.dob) return null;

        const birthdayDate = getNextBirthdayDate(member.dob, todayKey);

        if (
          !birthdayDate ||
          birthdayDate < todayKey ||
          birthdayDate > birthdayEndKey
        ) {
          return null;
        }

        return {
          id: member.id,
          name: member.name,
          dob: member.dob,
          profileImage: member.profileImage,
          birthdayDate,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => a.birthdayDate.localeCompare(b.birthdayDate))
      .slice(0, 6);

    /* ---------------- EXPIRY RESPONSE ---------------- */

    const expiryTotal = expiryTab === "overdue" ? overdueTotal : upcomingTotal;

    const expiryTotalPages = Math.max(
      1,
      Math.ceil(expiryTotal / EXPIRY_PAGE_SIZE)
    );

    const selectedBranch = appliedBranchId
      ? branches.find((b) => b.id === appliedBranchId) || null
      : null;

    return NextResponse.json(
      {
        success: true,

        scope: {
          branchId: appliedBranchId,
          branchName: selectedBranch?.name || "All Branches",
          canSelectBranch: !user.branchId,
        },

        branches,

        cards: {
          activeMembers,
          newMembers,
          monthRenewals,
          todayCollectionPaise: todayCollection._sum.amount || 0,
          weekCollectionPaise: weekCollection._sum.amount || 0,
          pendingDuePaise: pendingDue._sum.balanceAmount || 0,
          todayPlanExpiry,
          todayPresent: presentGroups.length,
        },

        financial: {
          period: {
            key: financialPeriod,
            from: financialRange.fromKey,
            to: financialRange.toKey,
          },
          collectionPaise: financialCollection._sum.amount || 0,
          expensesPaise: financialExpenses._sum.amount || 0,
        },

        chart: {
          period: {
            key: chartPeriod,
            from: chartRange.fromKey,
            to: chartRange.toKey,
          },
          data: Array.from(chartMap.values()),
        },

        sales: {
          period: {
            key: salesPeriod,
            from: salesRange.fromKey,
            to: salesRange.toKey,
          },
          totalPaise: salesTotalPaise,
          count: salesInvoices.length,
          data: Array.from(salesMap.values()),
        },

        upcomingBirthdays,

        expiry: {
          tab: expiryTab,
          days: EXPIRY_DAYS,
          overdueLookbackDays: OVERDUE_LOOKBACK_DAYS,
          upcomingTotal,
          overdueTotal,

          items: expirySubscriptions.map((subscription) => {
            const endKey = getIndiaDateKey(subscription.endDate);

            return {
              id: subscription.id,
              memberId: subscription.member.id,
              name: subscription.member.name,
              phone: subscription.member.phone,
              profileImage: subscription.member.profileImage,
              serviceName: subscription.serviceName,
              packageName: subscription.packageName,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
              // days left (upcoming) or days overdue (overdue)
              days:
                expiryTab === "overdue"
                  ? diffDays(endKey, todayKey)
                  : diffDays(todayKey, endKey),
            };
          }),

          total: expiryTotal,
          page: Math.min(expiryPage, expiryTotalPages),
          pageSize: EXPIRY_PAGE_SIZE,
          totalPages: expiryTotalPages,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("GET /api/dashboard/membership-sales error:", error);

    if (error instanceof Error && error.message === "INVALID_CUSTOM_RANGE") {
      return NextResponse.json(
        { success: false, message: "Choose a valid date range." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to load dashboard." },
      { status: 500 }
    );
  }
}