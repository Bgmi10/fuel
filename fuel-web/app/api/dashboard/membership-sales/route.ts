import {
  InvoiceIntent,
  InvoicePaymentStatus,
  InvoiceStatus,
  MemberStatus,
  SubscriptionStatus,
} from "@prisma/client";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getUserFromRequest,
} from "@/app/utils/auth";

import { prisma } from "@/prisma";

export const dynamic = "force-dynamic";

const INDIA_TIME_OFFSET_MS =
  330 * 60 * 1000;

const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

type Period =
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom";

const PERIODS = new Set<Period>([
  "today",
  "week",
  "month",
  "year",
  "custom",
]);

const EXPIRY_DAYS = 7;

const EXPIRY_PAGE_SIZE = 5;

const BIRTHDAY_DAYS = 28;

const pad = (value: number) =>
  String(value).padStart(2, "0");

const toDateKey = (
  year: number,
  month: number,
  day: number
) =>
  `${year}-${pad(month)}-${pad(day)}`;

const addDaysToDateKey = (
  dateKey: string,
  days: number
) => {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  const shifted = new Date(
    Date.UTC(
      year,
      month - 1,
      day + days
    )
  );

  return toDateKey(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
};

const getIndiaDateKey = (
  date = new Date()
) => {
  const shifted = new Date(
    date.getTime() +
      INDIA_TIME_OFFSET_MS
  );

  return toDateKey(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate()
  );
};

const indiaDayStartToUtc = (
  dateKey: string
) => {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0
    ) - INDIA_TIME_OFFSET_MS
  );
};

const indiaDayEndToUtc = (
  dateKey: string
) => {
  const nextDateKey =
    addDaysToDateKey(
      dateKey,
      1
    );

  return new Date(
    indiaDayStartToUtc(
      nextDateKey
    ).getTime() - 1
  );
};

const resolveDateRange = ({
  period,
  from,
  to,
}: {
  period: Period;
  from: string | null;
  to: string | null;
}) => {
  const todayKey =
    getIndiaDateKey();

  const [
    year,
    month,
    day,
  ] = todayKey
    .split("-")
    .map(Number);

  let fromKey = todayKey;
  let toKey = todayKey;

  if (period === "week") {
    const today = new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

    const dayOfWeek =
      today.getUTCDay();

    const daysSinceMonday =
      (dayOfWeek + 6) % 7;

    fromKey =
      addDaysToDateKey(
        todayKey,
        -daysSinceMonday
      );
  }

  if (period === "month") {
    fromKey = toDateKey(
      year,
      month,
      1
    );
  }

  if (period === "year") {
    fromKey = toDateKey(
      year,
      1,
      1
    );
  }

  if (period === "custom") {
    if (
      !from ||
      !to ||
      !DATE_PATTERN.test(from) ||
      !DATE_PATTERN.test(to) ||
      from > to
    ) {
      throw new Error(
        "INVALID_CUSTOM_RANGE"
      );
    }

    fromKey = from;
    toKey = to;
  }

  return {
    fromKey,
    toKey,

    startDate:
      indiaDayStartToUtc(
        fromKey
      ),

    endDate:
      indiaDayEndToUtc(
        toKey
      ),
  };
};

const getNextBirthdayDate = (
  dob: string,
  todayKey: string
) => {
  const [
    ,
    month,
    day,
  ] = dob
    .split("-")
    .map(Number);

  if (
    !month ||
    !day ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const [
    year,
  ] = todayKey
    .split("-")
    .map(Number);

  let birthdayKey =
    toDateKey(
      year,
      month,
      day
    );

  if (birthdayKey < todayKey) {
    birthdayKey =
      toDateKey(
        year + 1,
        month,
        day
      );
  }

  return birthdayKey;
};

const getChartKeys = (
  fromKey: string,
  toKey: string
) => {
  const result: string[] = [];

  let current = fromKey;

  while (current <= toKey) {
    result.push(current);

    current =
      addDaysToDateKey(
        current,
        1
      );
  }

  return result;
};

export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await getUserFromRequest(
        req
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const searchParams =
      req.nextUrl.searchParams;

    /*
     * -------------------------------------------------------
     * FINANCIAL / PIE PERIOD
     * -------------------------------------------------------
     */

    const requestedPeriod =
      (
        searchParams.get(
          "period"
        ) || "month"
      ) as Period;

    if (
      !PERIODS.has(
        requestedPeriod
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid financial period.",
        },
        {
          status: 400,
        }
      );
    }

    const financialRange =
      resolveDateRange({
        period:
          requestedPeriod,

        from:
          searchParams.get(
            "from"
          ),

        to:
          searchParams.get(
            "to"
          ),
      });

    /*
     * -------------------------------------------------------
     * CHART PERIOD
     * Completely independent from the pie period.
     * -------------------------------------------------------
     */

    const requestedChartPeriod =
      (
        searchParams.get(
          "chartPeriod"
        ) || "month"
      ) as Period;

    if (
      !PERIODS.has(
        requestedChartPeriod
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid chart period.",
        },
        {
          status: 400,
        }
      );
    }

    const chartRange =
      resolveDateRange({
        period:
          requestedChartPeriod,

        from:
          searchParams.get(
            "chartFrom"
          ),

        to:
          searchParams.get(
            "chartTo"
          ),
      });

    /*
     * -------------------------------------------------------
     * BRANCH
     * -------------------------------------------------------
     */

    const requestedBranchId =
      searchParams
        .get("branchId")
        ?.trim() || null;

    const appliedBranchId =
      user.branchId ||
      requestedBranchId ||
      null;

    if (
      !user.branchId &&
      requestedBranchId
    ) {
      const branchExists =
        await prisma.branch.findUnique(
          {
            where: {
              id: requestedBranchId,
            },

            select: {
              id: true,
            },
          }
        );

      if (!branchExists) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected branch was not found.",
          },
          {
            status: 404,
          }
        );
      }
    }

    const branchFilter =
      appliedBranchId
        ? {
            branchId:
              appliedBranchId,
          }
        : {};

    /*
     * -------------------------------------------------------
     * TODAY
     * -------------------------------------------------------
     */

    const todayKey =
      getIndiaDateKey();

    const todayStart =
      indiaDayStartToUtc(
        todayKey
      );

    const todayEnd =
      indiaDayEndToUtc(
        todayKey
      );

    const weekStartKey =
      (() => {
        const [
          year,
          month,
          day,
        ] = todayKey
          .split("-")
          .map(Number);

        const today = new Date(
          Date.UTC(
            year,
            month - 1,
            day
          )
        );

        const dayOfWeek =
          today.getUTCDay();

        const daysSinceMonday =
          (dayOfWeek + 6) % 7;

        return addDaysToDateKey(
          todayKey,
          -daysSinceMonday
        );
      })();

    const weekStart =
      indiaDayStartToUtc(
        weekStartKey
      );

    const monthStartKey =
      `${todayKey.slice(
        0,
        8
      )}01`;

    const monthStart =
      indiaDayStartToUtc(
        monthStartKey
      );

    /*
     * -------------------------------------------------------
     * EXPIRY RANGE
     * Next 7 days
     * -------------------------------------------------------
     */

    const expiryEndKey =
      addDaysToDateKey(
        todayKey,
        EXPIRY_DAYS
      );

    const expiryEnd =
      indiaDayEndToUtc(
        expiryEndKey
      );

    /*
     * -------------------------------------------------------
     * BIRTHDAY RANGE
     * Next 28 days
     * -------------------------------------------------------
     */

    const birthdayEndKey =
      addDaysToDateKey(
        todayKey,
        BIRTHDAY_DAYS
      );

    /*
     * -------------------------------------------------------
     * EXPIRY PAGINATION
     * -------------------------------------------------------
     */

    const requestedExpiryPage =
      Number(
        searchParams.get(
          "expiryPage"
        ) || "1"
      );

    const expiryPage =
      Number.isFinite(
        requestedExpiryPage
      ) &&
      requestedExpiryPage >= 1
        ? Math.floor(
            requestedExpiryPage
          )
        : 1;

    const expirySkip =
      (expiryPage - 1) *
      EXPIRY_PAGE_SIZE;

    /*
     * -------------------------------------------------------
     * COMMON PAYMENT FILTER
     * -------------------------------------------------------
     */

    const paidPaymentWhere = {
      status:
        InvoicePaymentStatus.PAID,

      invoice:
        appliedBranchId
          ? {
              branchId:
                appliedBranchId,
            }
          : undefined,
    };

    /*
     * -------------------------------------------------------
     * PARALLEL QUERIES
     * -------------------------------------------------------
     */

    const [
      activeMembers,
      todayPlanExpiry,
      todayPayments,
      weekPayments,
      pendingDueResult,
      todayRenewals,
      monthRenewals,
      financialPayments,
      financialExpenses,
      chartPayments,
      chartExpenses,
      expiryTotal,
      expirySubscriptions,
      birthdayMembers,
      branches,
    ] = await Promise.all([
      /*
       * Active members
       */

      prisma.member.count({
        where: {
          status:
            MemberStatus.ACTIVE,

          ...(appliedBranchId
            ? {
                branchId:
                  appliedBranchId,
              }
            : {}),

          subscriptions: {
            some: {
              status:
                SubscriptionStatus.ACTIVE,

              endDate: {
                gte: todayStart,
              },
            },
          },
        },
      }),

      /*
       * Today's membership expiry
       */

      prisma.subscription.count({
        where: {
          endDate: {
            gte: todayStart,
            lte: todayEnd,
          },

          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.FROZEN,
            ],
          },

          ...branchFilter,
        },
      }),

      /*
       * Today's collection
       */

      prisma.payment.findMany({
        where: {
          ...paidPaymentWhere,

          paidAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },

        select: {
          amount: true,
        },
      }),

      /*
       * Week collection
       */

      prisma.payment.findMany({
        where: {
          ...paidPaymentWhere,

          paidAt: {
            gte: weekStart,
            lte: todayEnd,
          },
        },

        select: {
          amount: true,
        },
      }),

      /*
       * Pending due
       *
       * Amount is stored in paise.
       */

      prisma.invoice.aggregate({
        _sum: {
          balanceAmount: true,
        },

        where: {
          status: {
            in: [
              InvoiceStatus.PENDING,
              InvoiceStatus.PARTIAL_PAID,
            ],
          },

          balanceAmount: {
            gt: 0,
          },

          ...branchFilter,
        },
      }),

      /*
       * Today's renewals
       */

      prisma.invoice.count({
        where: {
          intent:
            InvoiceIntent.EXTEND,

          status: {
            in: [
              InvoiceStatus.PARTIAL_PAID,
              InvoiceStatus.FULLY_PAID,
            ],
          },

          payments: {
            some: {
              status:
                InvoicePaymentStatus.PAID,

              paidAt: {
                gte: todayStart,
                lte: todayEnd,
              },
            },
          },

          ...branchFilter,
        },
      }),

      /*
       * This month's renewals
       */

      prisma.invoice.count({
        where: {
          intent:
            InvoiceIntent.EXTEND,

          status: {
            in: [
              InvoiceStatus.PARTIAL_PAID,
              InvoiceStatus.FULLY_PAID,
            ],
          },

          payments: {
            some: {
              status:
                InvoicePaymentStatus.PAID,

              paidAt: {
                gte: monthStart,
                lte: todayEnd,
              },
            },
          },

          ...branchFilter,
        },
      }),

      /*
       * Financial-period payments
       * Used ONLY by the pie chart.
       */

      prisma.payment.findMany({
        where: {
          ...paidPaymentWhere,

          paidAt: {
            gte:
              financialRange.startDate,

            lte:
              financialRange.endDate,
          },
        },

        select: {
          amount: true,
          paidAt: true,
        },
      }),

      /*
       * Financial-period expenses
       * Used ONLY by the pie chart.
       */

      prisma.expense.findMany({
        where: {
          date: {
            gte:
              financialRange.startDate,

            lte:
              financialRange.endDate,
          },

          ...(appliedBranchId
            ? {
                byUser: {
                  branchId:
                    appliedBranchId,
                },
              }
            : {}),
        },

        select: {
          amount: true,
          date: true,
        },
      }),

      /*
       * Chart payments
       *
       * This is intentionally separate from
       * financialPayments.
       */

      prisma.payment.findMany({
        where: {
          ...paidPaymentWhere,

          paidAt: {
            gte:
              chartRange.startDate,

            lte:
              chartRange.endDate,
          },
        },

        select: {
          amount: true,
          paidAt: true,
        },

        orderBy: {
          paidAt: "asc",
        },
      }),

      /*
       * Chart expenses
       */

      prisma.expense.findMany({
        where: {
          date: {
            gte:
              chartRange.startDate,

            lte:
              chartRange.endDate,
          },

          ...(appliedBranchId
            ? {
                byUser: {
                  branchId:
                    appliedBranchId,
                },
              }
            : {}),
        },

        select: {
          amount: true,
          date: true,
        },

        orderBy: {
          date: "asc",
        },
      }),

      /*
       * Expiry count
       */

      prisma.subscription.count({
        where: {
          endDate: {
            gte: todayStart,
            lte: expiryEnd,
          },

          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.FROZEN,
            ],
          },

          ...branchFilter,

          member: {
            status:
              MemberStatus.ACTIVE,
          },
        },
      }),

      /*
       * Expiry list
       */

      prisma.subscription.findMany({
        where: {
          endDate: {
            gte: todayStart,
            lte: expiryEnd,
          },

          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.FROZEN,
            ],
          },

          ...branchFilter,

          member: {
            status:
              MemberStatus.ACTIVE,
          },
        },

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
          {
            endDate: "asc",
          },
          {
            member: {
              name: "asc",
            },
          },
        ],

        skip: expirySkip,
        take: EXPIRY_PAGE_SIZE,
      }),

      /*
       * Birthday members
       */

      prisma.member.findMany({
        where: {
          dob: {
            not: null,
          },

          status:
            MemberStatus.ACTIVE,

          ...(appliedBranchId
            ? {
                branchId:
                  appliedBranchId,
              }
            : {}),
        },

        select: {
          id: true,
          name: true,
          dob: true,
          profileImage: true,
        },
      }),

      /*
       * Branches
       */

      prisma.branch.findMany({
        where:
          user.branchId
            ? {
                id:
                  user.branchId,
              }
            : undefined,

        select: {
          id: true,
          name: true,
        },

        orderBy: {
          name: "asc",
        },
      }),
    ]);

    /*
     * -------------------------------------------------------
     * PAISA TOTALS
     * -------------------------------------------------------
     */

    const todayCollectionPaise =
      todayPayments.reduce(
        (sum, payment) =>
          sum + payment.amount,
        0
      );

    const weekCollectionPaise =
      weekPayments.reduce(
        (sum, payment) =>
          sum + payment.amount,
        0
      );

    const pendingDuePaise =
      pendingDueResult._sum
        .balanceAmount || 0;

    const financialCollectionPaise =
      financialPayments.reduce(
        (sum, payment) =>
          sum + payment.amount,
        0
      );

    const financialExpensesPaise =
      financialExpenses.reduce(
        (sum, expense) =>
          sum +
          (expense.amount || 0),
        0
      );

    /*
     * -------------------------------------------------------
     * CHART
     *
     * Values remain in paise.
     * Frontend divides by 100 for display.
     * -------------------------------------------------------
     */

    const chartMap = new Map<
      string,
      {
        date: string;
        collectionPaise: number;
        expensesPaise: number;
      }
    >();

    const chartKeys =
      getChartKeys(
        chartRange.fromKey,
        chartRange.toKey
      );

    for (const date of chartKeys) {
      chartMap.set(date, {
        date,
        collectionPaise: 0,
        expensesPaise: 0,
      });
    }

    for (const payment of chartPayments) {
      const date =
        getIndiaDateKey(
          payment.paidAt
        );

      const row =
        chartMap.get(date);

      if (row) {
        row.collectionPaise +=
          payment.amount;
      }
    }

    for (const expense of chartExpenses) {
      if (!expense.date) {
        continue;
      }

      const date =
        getIndiaDateKey(
          expense.date
        );

      const row =
        chartMap.get(date);

      if (row) {
        row.expensesPaise +=
          expense.amount || 0;
      }
    }

    const chart =
      Array.from(
        chartMap.values()
      );

    /*
     * -------------------------------------------------------
     * UPCOMING BIRTHDAYS
     * -------------------------------------------------------
     */

    const upcomingBirthdays =
      birthdayMembers
        .map((member) => {
          if (!member.dob) {
            return null;
          }

          const birthdayDate =
            getNextBirthdayDate(
              member.dob,
              todayKey
            );

          if (!birthdayDate) {
            return null;
          }

          if (
            birthdayDate <
              todayKey ||
            birthdayDate >
              birthdayEndKey
          ) {
            return null;
          }

          return {
            id: member.id,
            name: member.name,
            dob: member.dob,
            profileImage:
              member.profileImage,
            birthdayDate,
          };
        })
        .filter(
          (
            member
          ): member is NonNullable<
            typeof member
          > =>
            member !== null
        )
        .sort((a, b) =>
          a.birthdayDate.localeCompare(
            b.birthdayDate
          )
        )
        .slice(0, 6);

    /*
     * -------------------------------------------------------
     * EXPIRY PAGINATION
     * -------------------------------------------------------
     */

    const expiryTotalPages =
      Math.max(
        1,
        Math.ceil(
          expiryTotal /
            EXPIRY_PAGE_SIZE
        )
      );

    const safeExpiryPage =
      Math.min(
        expiryPage,
        expiryTotalPages
      );

    /*
     * -------------------------------------------------------
     * SELECTED BRANCH
     * -------------------------------------------------------
     */

    const selectedBranch =
      appliedBranchId
        ? branches.find(
            (branch) =>
              branch.id ===
              appliedBranchId
          ) || null
        : null;

    /*
     * -------------------------------------------------------
     * RESPONSE
     * -------------------------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        scope: {
          branchId:
            appliedBranchId,

          branchName:
            selectedBranch?.name ||
            "All Branches",

          canSelectBranch:
            !user.branchId,
        },

        branches,

        cards: {
          activeMembers,

          todayPlanExpiry,

          todayCollectionPaise,

          weekCollectionPaise,

          pendingDuePaise,

          todayRenewals,

          monthRenewals,
        },

        financial: {
          period: {
            key:
              requestedPeriod,

            from:
              financialRange.fromKey,

            to:
              financialRange.toKey,
          },

          collectionPaise:
            financialCollectionPaise,

          expensesPaise:
            financialExpensesPaise,
        },

        chart: {
          period: {
            key:
              requestedChartPeriod,

            from:
              chartRange.fromKey,

            to:
              chartRange.toKey,
          },

          data: chart,
        },

        upcomingBirthdays,

        expiry: {
          days:
            EXPIRY_DAYS,

          items:
            expirySubscriptions.map(
              (subscription) => ({
                id:
                  subscription.id,

                memberId:
                  subscription.member
                    .id,

                name:
                  subscription.member
                    .name,

                phone:
                  subscription.member
                    .phone,

                profileImage:
                  subscription.member
                    .profileImage,

                serviceName:
                  subscription.serviceName,

                packageName:
                  subscription.packageName,

                startDate:
                  subscription.startDate,

                endDate:
                  subscription.endDate,
              })
            ),

          total:
            expiryTotal,

          page:
            Math.min(
              safeExpiryPage,
              expiryTotalPages
            ),

          pageSize:
            EXPIRY_PAGE_SIZE,

          totalPages:
            expiryTotalPages,
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "GET /api/dashboard/membership-sales error:",
      error
    );

    if (
      error instanceof Error &&
      error.message ===
        "INVALID_CUSTOM_RANGE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Choose a valid date range.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}