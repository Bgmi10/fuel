import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { getUserFromRequest } from "@/app/utils/auth";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 100;

/**
 * All "today / this month / this year" boundaries are calculated in
 * Asia/Kolkata (UTC+05:30, no DST), regardless of the server timezone.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const istNowParts = () => {
  const ist = new Date(Date.now() + IST_OFFSET_MS);

  return {
    y: ist.getUTCFullYear(),
    m: ist.getUTCMonth(),
    d: ist.getUTCDate(),
  };
};

// Midnight IST of the given calendar date, as a real instant.
// Date.UTC normalises overflowing months/days (e.g. month 12 -> next year).
const istMidnight = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);

const getPeriodRange = (period: string) => {
  const { y, m, d } = istNowParts();

  switch (period) {
    case "today":
      return { gte: istMidnight(y, m, d), lt: istMidnight(y, m, d + 1) };
    case "month":
      return { gte: istMidnight(y, m, 1), lt: istMidnight(y, m + 1, 1) };
    case "year":
      return { gte: istMidnight(y, 0, 1), lt: istMidnight(y + 1, 0, 1) };
    default:
      return null;
  }
};

const parseIstDate = (value: string, endOfDay: boolean) => {
  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const parseRupeesToPaise = (value: string) => {
  if (!value) return null;

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) return null;

  return Math.round(number * 100);
};

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const pageParam = Number(searchParams.get("page") || 1);
    const limitParam = Number(searchParams.get("limit") || DEFAULT_LIMIT);

    const page = Math.max(1, Number.isFinite(pageParam) ? pageParam : 1);

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(limitParam) ? limitParam : DEFAULT_LIMIT)
    );

    const get = (key: string) => searchParams.get(key)?.trim() || "";

    const search = get("search");
    const from = get("from");
    const to = get("to");
    const period = get("period") || "all";

    const paymentMode = get("paymentMode");
    const paymentType = get("paymentType");
    const intent = get("intent");
    const collectedBy = get("collectedBy");
    const requestedBranchId = get("branchId");
    const serviceId = get("serviceId");
    const subCategoryId = get("subCategoryId");
    const packageId = get("packageId");
    const minAmount = parseRupeesToPaise(get("minAmount"));
    const maxAmount = parseRupeesToPaise(get("maxAmount"));

    /**
     * Branch access:
     * A branch-bound user is always locked to their branch.
     * Otherwise the selected branch filter is used.
     */
    const appliedBranchId = user.branchId || requestedBranchId || null;

    /**
     * Payment has no branchId. Branch / sales rep / service /
     * subcategory / package / intent all come through Invoice.
     */
    const invoiceWhere: any = {};

    if (appliedBranchId) invoiceWhere.branchId = appliedBranchId;
    if (collectedBy) invoiceWhere.salesRepId = collectedBy;
    if (intent) invoiceWhere.intent = intent;
    if (packageId) invoiceWhere.packageId = packageId;
    if (subCategoryId) invoiceWhere.subCategoryId = subCategoryId;
    if (serviceId) invoiceWhere.package = { serviceId };

    /**
     * Every filter EXCEPT the date. The Today / Month / Year cards use
     * this, so they respond to the other filters but never to the
     * selected period.
     */
    const baseAnd: any[] = [
      // Collection page only shows successfully paid collections.
      { status: "PAID" },
    ];

    if (Object.keys(invoiceWhere).length > 0) {
      baseAnd.push({ invoice: invoiceWhere });
    }

    // Search: member name / phone, receipt number, invoice number
    if (search) {
      baseAnd.push({
        OR: [
          { member: { name: { contains: search, mode: "insensitive" } } },
          { member: { phone: { contains: search, mode: "insensitive" } } },
          { receiptNumber: { contains: search, mode: "insensitive" } },
          {
            invoice: {
              invoiceNumber: { contains: search, mode: "insensitive" },
            },
          },
        ],
      });
    }

    if (paymentMode) baseAnd.push({ paymentMode });
    if (paymentType) baseAnd.push({ paymentType });

    if (minAmount !== null || maxAmount !== null) {
      const amountWhere: any = {};

      if (minAmount !== null) amountWhere.gte = minAmount;
      if (maxAmount !== null) amountWhere.lte = maxAmount;

      baseAnd.push({ amount: amountWhere });
    }

    /**
     * Date filter for the list.
     * A manual from/to range wins; otherwise the period tab applies.
     */
    let paidAtFilter: any = null;

    if (from || to) {
      paidAtFilter = {};

      const fromDate = from ? parseIstDate(from, false) : null;
      const toDate = to ? parseIstDate(to, true) : null;

      if (fromDate) paidAtFilter.gte = fromDate;
      if (toDate) paidAtFilter.lte = toDate;

      if (Object.keys(paidAtFilter).length === 0) paidAtFilter = null;
    } else {
      paidAtFilter = getPeriodRange(period);
    }

    const where: any = {
      AND: paidAtFilter ? [...baseAnd, { paidAt: paidAtFilter }] : baseAnd,
    };

    const skip = (page - 1) * limit;

    /**
     * Filter option sources
     */
    const paymentModeWhere: any = { status: "PAID" };

    if (appliedBranchId) {
      paymentModeWhere.invoice = { branchId: appliedBranchId };
    }

    const staffWhere: any = {};

    if (appliedBranchId) staffWhere.branchId = appliedBranchId;

    const serviceWhere: any = appliedBranchId
      ? { branches: { some: { id: appliedBranchId } } }
      : undefined;

    const periodAggregate = (range: { gte: Date; lt: Date }) =>
      prisma.payment.aggregate({
        where: { AND: [...baseAnd, { paidAt: range }] },
        _sum: { amount: true },
        _count: { _all: true },
      });

    const todayRange = getPeriodRange("today")!;
    const monthRange = getPeriodRange("month")!;
    const yearRange = getPeriodRange("year")!;

    const [
      payments,
      total,
      aggregate,
      todayAgg,
      monthAgg,
      yearAgg,
      paymentModes,
      staff,
      branches,
      services,
      subCategories,
      packages,
    ] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: "desc" },

        select: {
          id: true,
          receiptNumber: true,
          amount: true,
          paymentMode: true,
          paymentType: true,
          status: true,
          paidAt: true,
          createdAt: true,

          member: {
            select: { id: true, name: true, phone: true },
          },

          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              serviceName: true,
              packageName: true,
              intent: true,
              totalTax: true,

              subCategory: {
                select: { id: true, name: true },
              },

              salesRep: {
                select: { id: true, name: true },
              },

              branch: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),

      prisma.payment.count({ where }),

      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
      }),

      // Period cards
      periodAggregate(todayRange),
      periodAggregate(monthRange),
      periodAggregate(yearRange),

      // Filter options
      prisma.payment.findMany({
        where: paymentModeWhere,
        distinct: ["paymentMode"],
        select: { paymentMode: true },
        orderBy: { paymentMode: "asc" },
      }),

      prisma.user.findMany({
        where: staffWhere,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.branch.findMany({
        where: user.branchId ? { id: user.branchId } : undefined,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.service.findMany({
        where: serviceWhere,
        select: { id: true, name: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),

      prisma.serviceSubCategory.findMany({
        select: { id: true, name: true, serviceId: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),

      prisma.servicePackage.findMany({
        select: { id: true, name: true, serviceId: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    /**
     * Flatten branch from payment.invoice.branch to payment.branch
     * so the client doesn't need to know the relation structure.
     */
    const data = payments.map((payment) => ({
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      amount: payment.amount,
      paymentMode: payment.paymentMode,
      paymentType: payment.paymentType,
      status: payment.status,

      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),

      member: {
        id: payment.member.id,
        name: payment.member.name,
        phone: payment.member.phone,
      },

      invoice: {
        id: payment.invoice.id,
        invoiceNumber: payment.invoice.invoiceNumber,
        serviceName: payment.invoice.serviceName,
        packageName: payment.invoice.packageName,
        intent: payment.invoice.intent,
        totalTax: payment.invoice.totalTax,

        subCategory: payment.invoice.subCategory
          ? {
              id: payment.invoice.subCategory.id,
              name: payment.invoice.subCategory.name,
            }
          : null,

        salesRep: payment.invoice.salesRep
          ? {
              id: payment.invoice.salesRep.id,
              name: payment.invoice.salesRep.name,
            }
          : null,
      },

      branch: payment.invoice.branch
        ? {
            id: payment.invoice.branch.id,
            name: payment.invoice.branch.name,
          }
        : null,
    }));

    const totalPages = Math.ceil(total / limit);

    const toStat = (agg: {
      _sum: { amount: number | null };
      _count: { _all: number };
    }) => ({
      count: agg._count._all,
      amount: agg._sum.amount || 0,
    });

    return NextResponse.json({
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },

      summary: {
        totalCount: total,
        totalAmount: aggregate._sum.amount || 0,
      },

      periodStats: {
        today: toStat(todayAgg),
        month: toStat(monthAgg),
        year: toStat(yearAgg),
      },

      filters: {
        paymentModes: paymentModes
          .map((item) => item.paymentMode)
          .filter(Boolean),

        paymentTypes: ["INITIAL", "BALANCE", "TRANSFER"],

        intents: ["NEW", "EXTEND", "UPGRADE", "TRANSFER_FEE"],

        staff,
        services,
        subCategories,
        packages,
      },

      scope: {
        branchId: appliedBranchId,
        canSelectBranch: !user.branchId,
      },

      branches,
    });
  } catch (error) {
    console.error("Collection API error:", error);

    return NextResponse.json(
      { message: "Failed to fetch collection data" },
      { status: 500 }
    );
  }
}