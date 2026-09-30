"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Cake,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  IndianRupee,
  RefreshCcw,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  LineChart,
} from "recharts";

import {
  useAuth,
} from "../contexts/AdminAuthContext";

type Period =
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom";

type DashboardData = {
  scope: {
    branchId:
      | string
      | null;

    branchName: string;

    canSelectBranch: boolean;
  };

  branches: Array<{
    id: string;
    name: string;
  }>;

  cards: {
    activeMembers: number;

    todayPlanExpiry: number;

    todayCollectionPaise: number;

    weekCollectionPaise: number;

    pendingDuePaise: number;

    todayRenewals: number;

    monthRenewals: number;
  };

  financial: {
    period: {
      key: Period;
      from: string;
      to: string;
    };

    collectionPaise: number;

    expensesPaise: number;
  };

  chart: {
    period: {
      key: Period;
      from: string;
      to: string;
    };

    data: Array<{
      date: string;
      collectionPaise: number;
      expensesPaise: number;
    }>;
  };

  upcomingBirthdays: Array<{
    id: string;
    name: string;
    dob: string;
    profileImage:
      | string
      | null;
    birthdayDate: string;
  }>;

  expiry: {
    days: number;

    items: Array<{
      id: string;
      memberId: string;
      name: string;
      phone: string;
      profileImage:
        | string
        | null;
      serviceName: string;
      packageName: string;
      startDate: string;
      endDate: string;
    }>;

    total: number;

    page: number;

    pageSize: number;

    totalPages: number;
  };
};

const FINANCIAL_PERIODS: Array<{
  value: Period;
  label: string;
}> = [
  {
    value: "today",
    label: "Today",
  },
  {
    value: "week",
    label: "Week",
  },
  {
    value: "month",
    label: "Month",
  },
  {
    value: "year",
    label: "Year",
  },
  {
    value: "custom",
    label: "Custom",
  },
];

const CHART_PERIODS: Array<{
  value: Period;
  label: string;
}> = [
  {
    value: "week",
    label: "7 Days",
  },
  {
    value: "month",
    label: "30 Days",
  },
  {
    value: "year",
    label: "This Year",
  },
  {
    value: "custom",
    label: "Custom",
  },
];

const EXPENSE_ROUTE =
  "/dashboard/expanse";

/*
 * Collection route was not explicitly specified,
 * so this points to the existing Finance section.
 */
const COLLECTION_ROUTE =
  "/dashboard/collection";

const formatDate = (
  value: string
) =>
  new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

const formatShortDate = (
  value: string
) =>
  new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  );

const formatDateTime = (
  value: string
) =>
  new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  );

const formatMoney = (
  paise: number
) =>
  `₹${(
    paise / 100
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  )}`;

const formatMoneyCompact = (
  paise: number
) => {
  const rupees =
    paise / 100;

  if (rupees >= 10000000) {
    return `₹${(
      rupees / 10000000
    ).toFixed(1)}Cr`;
  }

  if (rupees >= 100000) {
    return `₹${(
      rupees / 100000
    ).toFixed(1)}L`;
  }

  if (rupees >= 1000) {
    return `₹${(
      rupees / 1000
    ).toFixed(1)}K`;
  }

  return `₹${Math.round(
    rupees
  ).toLocaleString(
    "en-IN"
  )}`;
};

const getInitials = (
  name: string
) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0)
    )
    .join("")
    .toUpperCase();

export default function Page() {
  const { user } =
    useAuth();

  const router =
    useRouter();

  /*
   * -------------------------------------------------------
   * FINANCIAL FILTER
   * Only affects the pie.
   * -------------------------------------------------------
   */

  const [
    financialPeriod,
    setFinancialPeriod,
  ] =
    useState<Period>(
      "month"
    );

  const [
    financialFrom,
    setFinancialFrom,
  ] = useState("");

  const [
    financialTo,
    setFinancialTo,
  ] = useState("");

  /*
   * -------------------------------------------------------
   * CHART FILTER
   * Only affects the bottom chart.
   * -------------------------------------------------------
   */

  const [
    chartPeriod,
    setChartPeriod,
  ] =
    useState<Period>(
      "month"
    );

  const [
    chartFrom,
    setChartFrom,
  ] = useState("");

  const [
    chartTo,
    setChartTo,
  ] = useState("");

  /*
   * -------------------------------------------------------
   * BRANCH
   * -------------------------------------------------------
   */

  const [
    branchId,
    setBranchId,
  ] = useState("");

  /*
   * -------------------------------------------------------
   * EXPIRY PAGINATION
   * -------------------------------------------------------
   */

  const [
    expiryPage,
    setExpiryPage,
  ] = useState(1);

  /*
   * -------------------------------------------------------
   * DATA
   * -------------------------------------------------------
   */

  const [
    data,
    setData,
  ] =
    useState<DashboardData | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * -------------------------------------------------------
   * FETCH
   * -------------------------------------------------------
   */

  const fetchDashboard =
    useCallback(
      async () => {
        if (
          financialPeriod ===
            "custom" &&
          (
            !financialFrom ||
            !financialTo
          )
        ) {
          return;
        }

        if (
          chartPeriod ===
            "custom" &&
          (
            !chartFrom ||
            !chartTo
          )
        ) {
          return;
        }

        setLoading(true);
        setError("");

        try {
          const params =
            new URLSearchParams();

          /*
           * Financial / pie
           */

          params.set(
            "period",
            financialPeriod
          );

          if (
            financialPeriod ===
            "custom"
          ) {
            params.set(
              "from",
              financialFrom
            );

            params.set(
              "to",
              financialTo
            );
          }

          /*
           * Chart
           */

          params.set(
            "chartPeriod",
            chartPeriod
          );

          if (
            chartPeriod ===
            "custom"
          ) {
            params.set(
              "chartFrom",
              chartFrom
            );

            params.set(
              "chartTo",
              chartTo
            );
          }

          /*
           * Branch
           */

          if (branchId) {
            params.set(
              "branchId",
              branchId
            );
          }

          /*
           * Expiry page
           */

          params.set(
            "expiryPage",
            String(expiryPage)
          );

          const response =
            await fetch(
              `/api/dashboard/membership-sales?${params.toString()}`,
              {
                cache:
                  "no-store",
              }
            );

          const result =
            await response.json();

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
                "Failed to load dashboard"
            );
          }

          setData(result);

          /*
           * If branch is forced by user's account,
           * keep it selected.
           */

          if (
            result.scope
              .branchId &&
            !branchId
          ) {
            setBranchId(
              result.scope
                .branchId
            );
          }
        } catch (
          requestError
        ) {
          console.error(
            requestError
          );

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Failed to load dashboard"
          );
        } finally {
          setLoading(false);
        }
      },
      [
        financialPeriod,
        financialFrom,
        financialTo,
        chartPeriod,
        chartFrom,
        chartTo,
        branchId,
        expiryPage,
      ]
    );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /*
   * -------------------------------------------------------
   * RESET EXPIRY PAGE WHEN BRANCH CHANGES
   * -------------------------------------------------------
   */

  const handleBranchChange = (
    value: string
  ) => {
    setExpiryPage(1);
    setBranchId(value);
  };

  /*
   * -------------------------------------------------------
   * DATA
   * -------------------------------------------------------
   */

  const pieData = useMemo(
    () => [
      {
        name: "Collection",
        value:
          data?.financial
            .collectionPaise || 0,
        route:
          COLLECTION_ROUTE,
      },
      {
        name: "Expenses",
        value:
          data?.financial
            .expensesPaise || 0,
        route:
          EXPENSE_ROUTE,
      },
    ],
    [data]
  );

  /*
   * -------------------------------------------------------
   * KPI CARDS
   * -------------------------------------------------------
   */

  const cards = [
    {
      label:
        "Active Members",

      value:
        data?.cards
          .activeMembers ?? 0,

      detail:
        "Currently active memberships",

      icon:
        Users,

      style:
        "border-lime-500/20 bg-lime-500/5 text-lime-300",
    },

    {
      label:
        "Today's Plan Expiry",

      value:
        data?.cards
          .todayPlanExpiry ?? 0,

      detail:
        "Memberships ending today",

      icon:
        CalendarClock,

      style:
        "border-red-500/20 bg-red-500/5 text-red-300",
    },

    {
      label:
        "Today's Collection",

      value:
        formatMoney(
          data?.cards
            .todayCollectionPaise ||
            0
        ),

      detail:
        "Payments received today",

      icon:
        IndianRupee,

      style:
        "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
    },

    {
      label:
        "Week Collection",

      value:
        formatMoney(
          data?.cards
            .weekCollectionPaise ||
            0
        ),

      detail:
        "Monday to today",

      icon:
        WalletCards,

      style:
        "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
    },

    {
      label:
        "Pending Due",

      value:
        formatMoney(
          data?.cards
            .pendingDuePaise ||
            0
        ),

      detail:
        "Outstanding invoice balance",

      icon:
        CreditCard,

      style:
        "border-amber-500/20 bg-amber-500/5 text-amber-300",
    },

    {
      label:
        "Today's Renewal",

      value:
        data?.cards
          .todayRenewals ?? 0,

      detail:
        "Membership extensions today",

      icon:
        RefreshCcw,

      style:
        "border-violet-500/20 bg-violet-500/5 text-violet-300",
    },

    {
      label:
        "This Month Renewal",

      value:
        data?.cards
          .monthRenewals ?? 0,

      detail:
        "Membership extensions this month",

      icon:
        TrendingUp,

      style:
        "border-blue-500/20 bg-blue-500/5 text-blue-300",
    },
  ];

  /*
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-black p-5 text-white lg:p-6">
      <div className="mx-auto max-w-[1500px]">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Dashboard Overview
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Monitor members, collections,
              renewals and upcoming expiries.
            </p>

            {user?.name && (
              <p className="mt-1 text-xs text-neutral-700">
                Signed in as{" "}
                {user.name}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data?.scope
              .canSelectBranch && (
              <div className="relative">
                <select
                  value={
                    branchId
                  }
                  onChange={(
                    event
                  ) =>
                    handleBranchChange(
                      event.target
                        .value
                    )
                  }
                  className="h-10 min-w-[180px] appearance-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 pr-9 text-sm text-neutral-300 outline-none transition focus:border-lime-400"
                >
                  <option value="">
                    All Branches
                  </option>

                  {data.branches.map(
                    (
                      branch
                    ) => (
                      <option
                        key={
                          branch.id
                        }
                        value={
                          branch.id
                        }
                      >
                        {
                          branch.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={
                fetchDashboard
              }
              disabled={
                loading
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-sm text-neutral-300 transition hover:border-lime-400/50 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* KPI CARDS */}
        {/* ================================================= */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(
            (card) => {
              const Icon =
                card.icon;

              return (
                <div
                  key={
                    card.label
                  }
                  className={`rounded-2xl border p-5 ${card.style}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                        {
                          card.label
                        }
                      </p>

                      <p className="mt-3 text-2xl font-bold tracking-tight text-white">
                        {loading &&
                        !data
                          ? "—"
                          : card.value}
                      </p>

                      <p className="mt-2 text-xs text-neutral-500">
                        {
                          card.detail
                        }
                      </p>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/30">
                      <Icon
                        size={19}
                      />
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </section>

        {/* ================================================= */}
        {/* PIE + BIRTHDAYS */}
        {/* ================================================= */}

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          {/* ================================================= */}
          {/* COLLECTION VS EXPENSE */}
          {/* ================================================= */}

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 lg:p-6">
            <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CircleDollarSign
                    size={19}
                    className="text-lime-400"
                  />

                  <h2 className="text-lg font-semibold">
                    Collection vs Expenses
                  </h2>
                </div>

                <p className="mt-1 text-sm text-neutral-500">
                  Financial overview for the
                  selected period.
                </p>
              </div>

              {/* Financial filter ONLY */}
              <div>
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-neutral-800 bg-black/30 p-1">
                  {FINANCIAL_PERIODS.map(
                    (
                      option
                    ) => (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        onClick={() =>
                          setFinancialPeriod(
                            option.value
                          )
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs transition ${
                          financialPeriod ===
                          option.value
                            ? "bg-lime-400 text-black"
                            : "text-neutral-500 hover:text-white"
                        }`}
                      >
                        {
                          option.label
                        }
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {financialPeriod ===
              "custom" && (
              <div className="mt-4 grid gap-3 border-b border-neutral-800 pb-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs text-neutral-500">
                    From
                  </label>

                  <input
                    type="date"
                    value={
                      financialFrom
                    }
                    max={
                      financialTo ||
                      undefined
                    }
                    onChange={(
                      event
                    ) =>
                      setFinancialFrom(
                        event
                          .target
                          .value
                      )
                    }
                    style={{
                      colorScheme:
                        "dark",
                    }}
                    className="h-10 w-full rounded-xl border border-neutral-800 bg-black px-3 text-sm outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-neutral-500">
                    To
                  </label>

                  <input
                    type="date"
                    value={
                      financialTo
                    }
                    min={
                      financialFrom ||
                      undefined
                    }
                    onChange={(
                      event
                    ) =>
                      setFinancialTo(
                        event
                          .target
                          .value
                      )
                    }
                    style={{
                      colorScheme:
                        "dark",
                    }}
                    className="h-10 w-full rounded-xl border border-neutral-800 bg-black px-3 text-sm outline-none focus:border-lime-400"
                  />
                </div>
              </div>
            )}

            {data && (
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays
                    size={13}
                  />

                  {formatDate(
                    data.financial
                      .period
                      .from
                  )}

                  {" – "}

                  {formatDate(
                    data.financial
                      .period
                      .to
                  )}
                </span>

                <span>
                  {data.scope
                    .branchName}
                </span>
              </div>
            )}

            {/* PIE */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px] lg:items-center">
            <div className="h-[260px]">
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={68}
        outerRadius={100}
        paddingAngle={4}
        stroke="none"
        onClick={(entry) => {
          if (entry.name === "Expenses") {
            router.push(EXPENSE_ROUTE);
          }

          if (entry.name === "Collection") {
            router.push(COLLECTION_ROUTE);
          }
        }}
        style={{
          cursor: "pointer",
        }}
      >
        {pieData.map((entry) => (
          <Cell
            key={entry.name}
            fill={
              entry.name === "Collection"
                ? "#22c55e"
                : "#ef4444"
            }
          />
        ))}
      </Pie>

      <Tooltip
        formatter={(value) =>
          formatMoney(Number(value))
        }
        contentStyle={{
          background: "#171717",
          border: "1px solid #262626",
          borderRadius: "12px",
          color: "#fff",
        }}
      />
    </PieChart>
  </ResponsiveContainer>
</div>

              <div className="space-y-3">
                {/* COLLECTION */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      COLLECTION_ROUTE
                    )
                  }
                  className="group w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left transition hover:border-emerald-400/40 hover:bg-emerald-500/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

                      <span className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Collection
                      </span>
                    </div>

                    <ArrowUpRight
                      size={15}
                      className="text-neutral-600 transition group-hover:text-emerald-300"
                    />
                  </div>

                  <p className="mt-3 text-xl font-bold text-white">
                    {formatMoney(
                      data?.financial
                        .collectionPaise ||
                        0
                    )}
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    Click to open
                    collection
                  </p>
                </button>

                {/* EXPENSE */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      EXPENSE_ROUTE
                    )
                  }
                  className="group w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-left transition hover:border-red-400/40 hover:bg-red-500/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400" />

                      <span className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                        Expenses
                      </span>
                    </div>

                    <ArrowUpRight
                      size={15}
                      className="text-neutral-600 transition group-hover:text-red-300"
                    />
                  </div>

                  <p className="mt-3 text-xl font-bold text-white">
                    {formatMoney(
                      data?.financial
                        .expensesPaise ||
                        0
                    )}
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    Click to open
                    expenses
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* BIRTHDAYS */}
          {/* ================================================= */}

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 lg:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Cake
                    size={19}
                    className="text-lime-400"
                  />

                  <h2 className="text-lg font-semibold">
                    Upcoming Birthdays
                  </h2>
                </div>

                <p className="mt-1 text-sm text-neutral-500">
                  Members celebrating within
                  the next 28 days.
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400/10 text-lime-300">
                <Cake
                  size={17}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {!data ||
              data.upcomingBirthdays
                .length ===
                0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-neutral-800 text-sm text-neutral-600">
                  No upcoming
                  birthdays.
                </div>
              ) : (
                data.upcomingBirthdays.map(
                  (
                    birthday
                  ) => (
                    <button
                      key={
                        birthday.id
                      }
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/members/${birthday.id}`
                        )
                      }
                      className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent bg-black/20 p-3 text-left transition hover:border-lime-400/20 hover:bg-black/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {birthday.profileImage ? (
                          <img
                            src={
                              birthday.profileImage
                            }
                            alt={
                              birthday.name
                            }
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-300">
                            {getInitials(
                              birthday.name
                            )}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {
                              birthday.name
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-neutral-600">
                            Member
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-lime-300">
                          {formatShortDate(
                            birthday.birthdayDate
                          )}
                        </p>

                        <p className="mt-0.5 text-[11px] text-neutral-600">
                          Birthday
                        </p>
                      </div>
                    </button>
                  )
                )
              )}
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* MEMBERSHIP EXPIRY */}
        {/* ================================================= */}

        <section className="mt-5 rounded-3xl border border-neutral-800 bg-neutral-900">
          <div className="flex flex-col gap-4 border-b border-neutral-800 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div>
              <div className="flex items-center gap-2">
                <CalendarClock
                  size={19}
                  className="text-lime-400"
                />

                <h2 className="text-lg font-semibold">
                  Membership Expiry
                </h2>
              </div>

              <p className="mt-1 text-sm text-neutral-500">
                Memberships expiring within
                the next{" "}
                {data?.expiry.days ??
                  7}{" "}
                days.
              </p>
            </div>

          </div>

          <div className="divide-y divide-neutral-800">
            {loading &&
            !data ? (
              <div className="px-6 py-14 text-center text-sm text-neutral-600">
                Loading memberships...
              </div>
            ) : data?.expiry.items
                .length ===
              0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-lime-400/10 text-lime-300">
                  <CalendarDays
                    size={19}
                  />
                </div>

                <p className="mt-3 text-sm font-medium text-neutral-300">
                  No memberships expiring
                  soon.
                </p>

                <p className="mt-1 text-xs text-neutral-600">
                  You're clear for the
                  next{" "}
                  {data?.expiry.days ??
                    7}{" "}
                  days.
                </p>
              </div>
            ) : (
              data?.expiry.items.map(
                (
                  membership
                ) => {
                  const endDate =
                    new Date(
                      membership.endDate
                    );

                  const today =
                    new Date();

                  const diff =
                    Math.ceil(
                      (
                        endDate.getTime() -
                        today.getTime()
                      ) /
                        (
                          1000 *
                          60 *
                          60 *
                          24
                        )
                    );

                  const daysLeft =
                    Math.max(
                      0,
                      diff
                    );

                  return (
                    <button
                      key={
                        membership.id
                      }
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/members/${membership.memberId}`
                        )
                      }
                      className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.02] lg:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {membership.profileImage ? (
                          <img
                            src={
                              membership.profileImage
                            }
                            alt={
                              membership.name
                            }
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-300">
                            {getInitials(
                              membership.name
                            )}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {
                              membership.name
                            }
                          </p>

                          <p className="mt-1 truncate text-xs text-neutral-500">
                            {
                              membership.serviceName
                            }{" "}
                            ·{" "}
                            {
                              membership.packageName
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-5">
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-neutral-600">
                            Expires
                          </p>

                          <p className="mt-1 text-sm font-medium text-neutral-300">
                            {formatDateTime(
                              membership.endDate
                            )}
                          </p>
                        </div>

                        <div
                          className={`min-w-[74px] rounded-xl px-3 py-2 text-center ${
                            daysLeft <=
                            2
                              ? "bg-red-500/10 text-red-300"
                              : daysLeft <=
                                4
                              ? "bg-amber-500/10 text-amber-300"
                              : "bg-lime-500/10 text-lime-300"
                          }`}
                        >
                          <p className="text-sm font-semibold">
                            {daysLeft}
                          </p>

                          <p className="text-[10px] uppercase tracking-wide opacity-70">
                            days left
                          </p>
                        </div>

                        <ChevronRight
                          size={17}
                          className="text-neutral-700 transition group-hover:text-lime-400"
                        />
                      </div>
                    </button>
                  );
                }
              )
            )}
          </div>

          {/* Pagination */}
          {data &&
            data.expiry
              .totalPages >
              1 && (
              <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-4 lg:px-6">
                <p className="text-xs text-neutral-600">
                  Showing{" "}
                  {(
                    (
                      data.expiry
                        .page -
                      1
                    ) *
                      data.expiry
                        .pageSize +
                    1
                  )}{" "}
                  –{" "}
                  {Math.min(
                    data.expiry.page *
                      data.expiry
                        .pageSize,
                    data.expiry
                      .total
                  )}{" "}
                  of{" "}
                  {data.expiry
                    .total}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      data.expiry
                        .page <=
                      1
                    }
                    onClick={() =>
                      setExpiryPage(
                        (
                          current
                        ) =>
                          Math.max(
                            1,
                            current -
                              1
                          )
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-black/20 text-neutral-500 transition hover:border-lime-400/40 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft
                      size={15}
                    />
                  </button>

                  <span className="min-w-16 text-center text-xs text-neutral-500">
                    Page{" "}
                    {
                      data.expiry
                        .page
                    }{" "}
                    /{" "}
                    {
                      data.expiry
                        .totalPages
                    }
                  </span>

                  <button
                    type="button"
                    disabled={
                      data.expiry
                        .page >=
                      data.expiry
                        .totalPages
                    }
                    onClick={() =>
                      setExpiryPage(
                        (
                          current
                        ) =>
                          Math.min(
                            data.expiry
                              .totalPages,
                            current +
                              1
                          )
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-black/20 text-neutral-500 transition hover:border-lime-400/40 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight
                      size={15}
                    />
                  </button>
                </div>
              </div>
            )}
        </section>

        {/* ================================================= */}
        {/* COLLECTION TREND */}
        {/* ================================================= */}

        <section className="mt-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-5 lg:p-6">
          <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp
                  size={19}
                  className="text-lime-400"
                />

                <h2 className="text-lg font-semibold">
                  Collection Trend
                </h2>
              </div>

              <p className="mt-1 text-sm text-neutral-500">
                Daily collection for the selected
                chart period.
              </p>
            </div>

            {/* IMPORTANT:
                This filter only controls the
                bottom chart. */}
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-neutral-800 bg-black/30 p-1">
              {CHART_PERIODS.map(
                (option) => (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    onClick={() =>
                      setChartPeriod(
                        option.value
                      )
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs transition ${
                      chartPeriod ===
                      option.value
                        ? "bg-lime-400 text-black"
                        : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    {
                      option.label
                    }
                  </button>
                )
              )}
            </div>
          </div>

          {chartPeriod ===
            "custom" && (
            <div className="mt-4 grid gap-3 border-b border-neutral-800 pb-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-neutral-500">
                  From
                </label>

                <input
                  type="date"
                  value={
                    chartFrom
                  }
                  max={
                    chartTo ||
                    undefined
                  }
                  onChange={(
                    event
                  ) =>
                    setChartFrom(
                      event
                        .target
                        .value
                    )
                  }
                  style={{
                    colorScheme:
                      "dark",
                  }}
                  className="h-10 w-full rounded-xl border border-neutral-800 bg-black px-3 text-sm outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-neutral-500">
                  To
                </label>

                <input
                  type="date"
                  value={
                    chartTo
                  }
                  min={
                    chartFrom ||
                    undefined
                  }
                  onChange={(
                    event
                  ) =>
                    setChartTo(
                      event
                        .target
                        .value
                    )
                  }
                  style={{
                    colorScheme:
                      "dark",
                  }}
                  className="h-10 w-full rounded-xl border border-neutral-800 bg-black px-3 text-sm outline-none focus:border-lime-400"
                />
              </div>
            </div>
          )}

          {data && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays
                    size={13}
                  />

                  {formatDate(
                    data.chart
                      .period
                      .from
                  )}

                  {" – "}

                  {formatDate(
                    data.chart
                      .period
                      .to
                  )}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-2 text-neutral-400">
                  <span className="h-2 w-2 rounded-full bg-lime-400" />
                  Collection
                </span>

                <span className="inline-flex items-center gap-2 text-neutral-400">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Expenses
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 h-[340px]">
            {loading &&
            !data ? (
              <div className="flex h-full items-center justify-center text-sm text-neutral-600">
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    data?.chart
                      .data ||
                    []
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#262626"
                  />

                  <XAxis
                    dataKey="date"
                    tickFormatter={
                      formatShortDate
                    }
                    tick={{
                      fill: "#737373",
                      fontSize: 11,
                    }}
                    axisLine={{
                      stroke:
                        "#262626",
                    }}
                    tickLine={
                      false
                    }
                  />

                  <YAxis
                    tickFormatter={(
                      value
                    ) =>
                      formatMoneyCompact(
                        Number(
                          value
                        )
                      )
                    }
                    tick={{
                      fill: "#737373",
                      fontSize: 11,
                    }}
                    axisLine={
                      false
                    }
                    tickLine={
                      false
                    }
                    width={60}
                  />

                  <Tooltip
                    labelFormatter={(
                      value
                    ) =>
                      formatDate(
                        String(
                          value
                        )
                      )
                    }
                    formatter={(
                      value,
                      name
                    ) => [
                      formatMoney(
                        Number(
                          value
                        )
                      ),
                      name ===
                      "collectionPaise"
                        ? "Collection"
                        : "Expenses",
                    ]}
                    contentStyle={{
                      background:
                        "#171717",
                      border:
                        "1px solid #262626",
                      borderRadius:
                        "12px",
                      color:
                        "#fff",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="collectionPaise"
                    stroke="#a3e635"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 4,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="expensesPaise"
                    stroke="#f87171"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}