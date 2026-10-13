import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { getUserFromRequest } from "@/app/utils/auth";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 100;

/**
 * "This month" and "this financial year" boundaries are calculated in
 * Asia/Kolkata (UTC+05:30, no DST), whatever the server timezone is.
 * Indian financial year: 1 April -> 31 March.
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

// Midnight IST of a calendar date, as a real instant.
// Date.UTC normalises overflowing months/days.
const istMidnight = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);

const getFinancialYearStart = () => {
  const { y, m } = istNowParts();
  // April is month index 3
  return m >= 3 ? y : y - 1;
};

const getPeriodRange = (period: string) => {
  const { y, m } = istNowParts();

  switch (period) {
    case "month":
      return { gte: istMidnight(y, m, 1), lt: istMidnight(y, m + 1, 1) };
    case "fy": {
      const start = getFinancialYearStart();
      return {
        gte: istMidnight(start, 3, 1),
        lt: istMidnight(start + 1, 3, 1),
      };
    }
    default:
      return null;
  }
};

const getFinancialYearLabel = () => {
  const start = getFinancialYearStart();
  return `FY ${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};

const parseIstDate = (value: string, endOfDay: boolean) => {
  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const buildDateRange = (from: string, to: string) => {
  const range: any = {};

  const fromDate = from ? parseIstDate(from, false) : null;
  const toDate = to ? parseIstDate(to, true) : null;

  if (fromDate) range.gte = fromDate;
  if (toDate) range.lte = toDate;

  return Object.keys(range).length > 0 ? range : null;
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
    const endsFrom = get("endsFrom");
    const endsTo = get("endsTo");
    const period = get("period") || "all";

    const paymentMode = get("paymentMode");
    const paymentType = get("paymentType");
    const status = get("status");
    const intent = get("intent");
    const salesRepId = get("salesRepId");
    const requestedBranchId = get("branchId");
    const serviceId = get("serviceId");
    const subCategoryId = get("subCategoryId");
    const packageId = get("packageId");
    const minAmount = parseRupeesToPaise(get("minAmount"));
    const maxAmount = parseRupeesToPaise(get("maxAmount"));

    /**
     * Branch access.
     * Branch-restricted users can only see their branch.
     * Unrestricted users can pick one.
     */
    const appliedBranchId = user.branchId || requestedBranchId || null;

    /**
     * Every filter EXCEPT the invoice date. The This Month /
     * This Financial Year cards use this, so they respond to all other
     * filters but never to the selected period.
     */
    const baseAnd: any[] = [];

    if (appliedBranchId) baseAnd.push({ branchId: appliedBranchId });
    if (salesRepId) baseAnd.push({ salesRepId });
    if (status) baseAnd.push({ status });
    if (intent) baseAnd.push({ intent });
    if (packageId) baseAnd.push({ packageId });
    if (subCategoryId) baseAnd.push({ subCategoryId });
    if (serviceId) baseAnd.push({ package: { serviceId } });

    // Search: invoice number, member name / phone, package, service
    if (search) {
      baseAnd.push({
        OR: [
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { member: { name: { contains: search, mode: "insensitive" } } },
          { member: { phone: { contains: search, mode: "insensitive" } } },
          { packageName: { contains: search, mode: "insensitive" } },
          { serviceName: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    /**
     * Payment mode / type live on Payment, not Invoice.
     * Both go into ONE `some` so a single payment has to match both.
     */
    if (paymentMode || paymentType) {
      const paymentSome: any = { status: "PAID" };

      if (paymentMode) paymentSome.paymentMode = paymentMode;
      if (paymentType) paymentSome.paymentType = paymentType;

      baseAnd.push({ payments: { some: paymentSome } });
    }

    // Invoice amount range
    if (minAmount !== null || maxAmount !== null) {
      const amountWhere: any = {};

      if (minAmount !== null) amountWhere.gte = minAmount;
      if (maxAmount !== null) amountWhere.lte = maxAmount;

      baseAnd.push({ finalAmount: amountWhere });
    }

    // Membership validity: filter on the subscription end date
    const endsRange = buildDateRange(endsFrom, endsTo);

    if (endsRange) {
      baseAnd.push({ subscription: { is: { endDate: endsRange } } });
    }

    /**
     * Invoice date for the list.
     * A manual from/to range wins; otherwise the period tab applies.
     * Uses createdAt, as before (Invoice has no invoiceDate field).
     */
    const manualRange = buildDateRange(from, to);
    const createdAtFilter = manualRange ?? getPeriodRange(period);

    const where: any = {
      AND: createdAtFilter
        ? [...baseAnd, { createdAt: createdAtFilter }]
        : baseAnd,
    };

    const skip = (page - 1) * limit;

    /**
     * Cards ignore cancelled invoices unless the user is explicitly
     * filtering by a status, so cancelled invoices don't inflate
     * "invoiced" totals.
     */
    const cardAnd = status
      ? baseAnd
      : [...baseAnd, { status: { not: "CANCELLED" } }];

    const periodAggregate = (range: { gte: Date; lt: Date }) =>
      prisma.invoice.aggregate({
        where: { AND: [...cardAnd, { createdAt: range }] },
        _sum: { finalAmount: true, paidAmount: true, balanceAmount: true },
        _count: { _all: true },
      });

    const monthRange = getPeriodRange("month")!;
    const fyRange = getPeriodRange("fy")!;

    /**
     * Filter option sources
     */
    const paymentWhere: any = { status: "PAID" };

    if (appliedBranchId) {
      paymentWhere.invoice = { branchId: appliedBranchId };
    }

    const staffWhere: any = {};

    if (appliedBranchId) staffWhere.branchId = appliedBranchId;

    const serviceWhere: any = appliedBranchId
      ? { branches: { some: { id: appliedBranchId } } }
      : undefined;

    const [
      invoices,
      total,
      aggregate,
      monthAgg,
      fyAgg,
      paymentModes,
      staff,
      branches,
      services,
      subCategories,
      packages,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },

        select: {
          id: true,
          invoiceNumber: true,

          groupMemberCount: true,
          groupDiscountPercentage: true,

          packageId: true,

          serviceName: true,
          packageName: true,
          packageDurationInDays: true,

          branchName: true,

          memberName: true,
          memberPhone: true,
          memberEmail: true,

          packageAmount: true,
          discountAmount: true,
          finalAmount: true,

          paidAmount: true,
          balanceAmount: true,

          cgstPercentage: true,
          sgstPercentage: true,
          cgstAmount: true,
          sgstAmount: true,
          totalTax: true,

          referralDiscountAmount: true,

          status: true,
          intent: true,

          notes: true,

          createdAt: true,
          updatedAt: true,

          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              age: true,
            },
          },

          branch: { select: { id: true, name: true } },

          salesRep: { select: { id: true, name: true } },

          subCategory: { select: { id: true, name: true } },

          subscription: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              status: true,
            },
          },

          // Latest successful payment, for transaction date / mode.
          payments: {
            where: { status: "PAID" },
            orderBy: { paidAt: "desc" },
            take: 1,
            select: {
              id: true,
              amount: true,
              paymentMode: true,
              paymentType: true,
              status: true,
              paidAt: true,
              receiptNumber: true,
            },
          },
        },
      }),

      prisma.invoice.count({ where }),

      prisma.invoice.aggregate({
        where,
        _sum: {
          finalAmount: true,
          paidAmount: true,
          balanceAmount: true,
        },
      }),

      // Period cards
      periodAggregate(monthRange),
      periodAggregate(fyRange),

      // Filter options
      prisma.payment.findMany({
        where: paymentWhere,
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

    const data = invoices.map((invoice) => {
      const latestPayment = invoice.payments[0] || null;

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,

        member: {
          id: invoice.member.id,
          name: invoice.member.name,
          phone: invoice.member.phone,
          email: invoice.member.email,
          age: invoice.member.age,
        },

        branch: invoice.branch
          ? { id: invoice.branch.id, name: invoice.branch.name }
          : null,

        serviceName: invoice.serviceName,
        packageName: invoice.packageName,
        packageDurationInDays: invoice.packageDurationInDays,

        subCategory: invoice.subCategory
          ? { id: invoice.subCategory.id, name: invoice.subCategory.name }
          : null,

        intent: invoice.intent,
        status: invoice.status,

        amount: invoice.finalAmount,

        packageAmount: invoice.packageAmount,
        discountAmount: invoice.discountAmount,
        referralDiscountAmount: invoice.referralDiscountAmount,

        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,

        totalTax: invoice.totalTax,

        groupMemberCount: invoice.groupMemberCount,
        groupDiscountPercentage: invoice.groupDiscountPercentage,

        salesRep: invoice.salesRep
          ? { id: invoice.salesRep.id, name: invoice.salesRep.name }
          : null,

        // Membership validity comes from Subscription.
        validity: invoice.subscription
          ? {
              from: invoice.subscription.startDate.toISOString(),
              to: invoice.subscription.endDate.toISOString(),
              status: invoice.subscription.status,
            }
          : null,

        // Payment date if one exists, otherwise invoice creation.
        transactionDate: latestPayment?.paidAt
          ? latestPayment.paidAt.toISOString()
          : invoice.createdAt.toISOString(),

        payment: latestPayment
          ? {
              id: latestPayment.id,
              amount: latestPayment.amount,
              paymentMode: latestPayment.paymentMode,
              paymentType: latestPayment.paymentType,
              receiptNumber: latestPayment.receiptNumber,
              paidAt: latestPayment.paidAt.toISOString(),
            }
          : null,

        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit);

    const toStat = (agg: {
      _sum: {
        finalAmount: number | null;
        paidAmount: number | null;
        balanceAmount: number | null;
      };
      _count: { _all: number };
    }) => ({
      count: agg._count._all,
      amount: agg._sum.finalAmount || 0,
      paid: agg._sum.paidAmount || 0,
      balance: agg._sum.balanceAmount || 0,
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
        totalAmount: aggregate._sum.finalAmount || 0,
        totalPaid: aggregate._sum.paidAmount || 0,
        totalBalance: aggregate._sum.balanceAmount || 0,
      },

      periodStats: {
        month: toStat(monthAgg),
        fy: { ...toStat(fyAgg), label: getFinancialYearLabel() },
      },

      filters: {
        paymentModes: paymentModes
          .map((item) => item.paymentMode)
          .filter(Boolean),

        paymentTypes: ["INITIAL", "BALANCE", "TRANSFER"],

        statuses: ["PENDING", "PARTIAL_PAID", "FULLY_PAID", "CANCELLED"],

        // Order matches the dropdown: New, Renewal, Transferred, Upgrade
        intents: ["NEW", "EXTEND", "TRANSFER_FEE", "UPGRADE"],

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
    console.error("Invoice API error:", error);

    return NextResponse.json(
      { message: "Failed to fetch invoice data" },
      { status: 500 }
    );
  }
}