import {
    InvoiceIntent,
    InvoicePaymentStatus,
    InvoiceStatus,
    PaymentType,
  } from "@prisma/client";
  
  import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import {
    getUserFromRequest,
  } from "@/app/utils/auth";
  
  import { prisma } from "@/prisma";
  
  export const dynamic =
    "force-dynamic";
  
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
  
  const PERIODS =
    new Set<Period>([
      "today",
      "week",
      "month",
      "year",
      "custom",
    ]);
  
  const pad = (
    value: number
  ) =>
    String(value).padStart(
      2,
      "0"
    );
  
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
  
    const shifted =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day + days
        )
      );
  
    return toDateKey(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() +
        1,
      shifted.getUTCDate()
    );
  };
  
  const getIndiaDateKey = (
    date = new Date()
  ) => {
    const shifted =
      new Date(
        date.getTime() +
          INDIA_TIME_OFFSET_MS
      );
  
    return toDateKey(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth() +
        1,
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
      ) -
        INDIA_TIME_OFFSET_MS
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
  
    let fromKey =
      todayKey;
  
    let toKey =
      todayKey;
  
    if (period === "week") {
      const shiftedToday =
        new Date(
          Date.UTC(
            year,
            month - 1,
            day
          )
        );
  
      const dayOfWeek =
        shiftedToday.getUTCDay();
  
      const daysSinceMonday =
        (dayOfWeek + 6) % 7;
  
      fromKey =
        addDaysToDateKey(
          todayKey,
          -daysSinceMonday
        );
    }
  
    if (period === "month") {
      fromKey =
        toDateKey(
          year,
          month,
          1
        );
    }
  
    if (period === "year") {
      fromKey =
        toDateKey(
          year,
          1,
          1
        );
    }
  
    if (period === "custom") {
      if (
        !from ||
        !to ||
        !DATE_PATTERN.test(
          from
        ) ||
        !DATE_PATTERN.test(
          to
        ) ||
        from > to
      ) {
        throw new Error(
          "INVALID_CUSTOM_RANGE"
        );
      }
  
      fromKey =
        from;
  
      toKey =
        to;
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
            message:
              "Unauthorized",
          },
          {
            status: 401,
          }
        );
      }
  
      const searchParams =
        req.nextUrl.searchParams;
  
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
              "Invalid period.",
          },
          {
            status: 400,
          }
        );
      }
  
      const {
        fromKey,
        toKey,
        startDate,
        endDate,
      } = resolveDateRange({
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
          await prisma.branch
            .findUnique({
              where: {
                id:
                  requestedBranchId,
              },
  
              select: {
                id: true,
              },
            });
  
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
  
      const [
        groupedSales,
        branches,
      ] =
        await Promise.all([
          prisma.invoice.groupBy({
            by: [
              "serviceName",
              "intent",
            ],
  
            where: {
              ...(appliedBranchId
                ? {
                    branchId:
                      appliedBranchId,
                  }
                : {}),
  
              intent: {
                in: [
                  InvoiceIntent.NEW,
                  InvoiceIntent.EXTEND,
                ],
              },
  
              status: {
                in: [
                  InvoiceStatus
                    .PARTIAL_PAID,
  
                  InvoiceStatus
                    .FULLY_PAID,
                ],
              },
  
              payments: {
                some: {
                  status:
                    InvoicePaymentStatus
                      .PAID,
  
                  paymentType:
                    PaymentType.INITIAL,
  
                  paidAt: {
                    gte:
                      startDate,
  
                    lte:
                      endDate,
                  },
                },
              },
            },
  
            _count: {
              id: true,
            },
  
            orderBy: {
              serviceName:
                "asc",
            },
          }),
  
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
  
      const serviceMap =
        new Map<
          string,
          {
            serviceName: string;
            newCount: number;
            renewalCount: number;
            totalCount: number;
            renewalRate: number;
          }
        >();
  
      for (
        const row of
        groupedSales
      ) {
        const current =
          serviceMap.get(
            row.serviceName
          ) || {
            serviceName:
              row.serviceName,
  
            newCount: 0,
            renewalCount: 0,
            totalCount: 0,
            renewalRate: 0,
          };
  
        if (
          row.intent ===
          InvoiceIntent.NEW
        ) {
          current.newCount =
            row._count.id;
        }
  
        if (
          row.intent ===
          InvoiceIntent.EXTEND
        ) {
          current.renewalCount =
            row._count.id;
        }
  
        current.totalCount =
          current.newCount +
          current.renewalCount;
  
        current.renewalRate =
          current.totalCount > 0
            ? Number(
                (
                  (
                    current
                      .renewalCount /
                    current.totalCount
                  ) *
                  100
                ).toFixed(2)
              )
            : 0;
  
        serviceMap.set(
          row.serviceName,
          current
        );
      }
  
      const services =
        Array.from(
          serviceMap.values()
        ).sort(
          (first, second) =>
            second.totalCount -
              first.totalCount ||
            first.serviceName
              .localeCompare(
                second.serviceName
              )
        );
  
      const summary =
        services.reduce(
          (
            totals,
            service
          ) => {
            totals.newMemberships +=
              service.newCount;
  
            totals.renewals +=
              service.renewalCount;
  
            totals.totalMembershipSales +=
              service.totalCount;
  
            return totals;
          },
          {
            newMemberships: 0,
            renewals: 0,
            totalMembershipSales: 0,
            renewalRate: 0,
          }
        );
  
      summary.renewalRate =
        summary
          .totalMembershipSales >
        0
          ? Number(
              (
                (
                  summary.renewals /
                  summary
                    .totalMembershipSales
                ) *
                100
              ).toFixed(2)
            )
          : 0;
  
      const selectedBranch =
        appliedBranchId
          ? branches.find(
              (branch) =>
                branch.id ===
                appliedBranchId
            ) || null
          : null;
  
      return NextResponse.json(
        {
          success: true,
  
          period: {
            key:
              requestedPeriod,
  
            from:
              fromKey,
  
            to:
              toKey,
          },
  
          scope: {
            branchId:
              appliedBranchId,
  
            branchName:
              selectedBranch
                ?.name ||
              "All Branches",
  
            canSelectBranch:
              !user.branchId,
          },
  
          branches,
  
          summary,
  
          services,
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
        error instanceof
          Error &&
        error.message ===
          "INVALID_CUSTOM_RANGE"
      ) {
        return NextResponse.json(
          {
            success: false,
  
            message:
              "Choose a valid custom date range.",
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
            "Failed to load membership sales insights.",
        },
        {
          status: 500,
        }
      );
    }
  }