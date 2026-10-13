"use client";

import {
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
  UserCheck,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "../contexts/AdminAuthContext";

type Period = "today" | "week" | "month" | "year" | "custom";
type ExpiryTab = "upcoming" | "overdue";

type DashboardData = {
  scope: {
    branchId: string | null;
    branchName: string;
    canSelectBranch: boolean;
  };
  branches: Array<{ id: string; name: string }>;
  cards: {
    activeMembers: number;
    newMembers: number;
    monthRenewals: number;
    todayCollectionPaise: number;
    weekCollectionPaise: number;
    pendingDuePaise: number;
    todayPlanExpiry: number;
    todayPresent: number;
  };
  financial: {
    period: { key: Period; from: string; to: string };
    collectionPaise: number;
    expensesPaise: number;
  };
  chart: {
    period: { key: Period; from: string; to: string };
    data: Array<{
      date: string;
      collectionPaise: number;
      expensesPaise: number;
    }>;
  };
  sales: {
    period: { key: Period; from: string; to: string };
    totalPaise: number;
    count: number;
    data: Array<{ date: string; salesPaise: number; count: number }>;
  };
  upcomingBirthdays: Array<{
    id: string;
    name: string;
    dob: string;
    profileImage: string | null;
    birthdayDate: string;
  }>;
  expiry: {
    tab: ExpiryTab;
    days: number;
    overdueLookbackDays: number;
    upcomingTotal: number;
    overdueTotal: number;
    items: Array<{
      id: string;
      memberId: string;
      name: string;
      phone: string;
      profileImage: string | null;
      serviceName: string;
      packageName: string;
      startDate: string;
      endDate: string;
      days: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const FINANCIAL_PERIODS: Array<{ value: Period; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

const TREND_PERIODS: Array<{ value: Period; label: string }> = [
  { value: "week", label: "7 Days" },
  { value: "month", label: "30 Days" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatShortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const formatDay = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
  });

const formatMoney = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatMoneyCompact = (paise: number) => {
  const rupees = paise / 100;

  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;

  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

/* ============================================================
 * SMALL SHARED PIECES
 * ============================================================ */

function PeriodTabs({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: Period; label: string }>;
  value: Period;
  onChange: (value: Period) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-neutral-800 bg-black/30 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-xs transition ${
            value === option.value
              ? "bg-lime-400 text-black"
              : "text-neutral-500 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CustomRange({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  const inputClass =
    "h-10 w-full rounded-xl border border-neutral-800 bg-black px-3 text-sm outline-none focus:border-lime-400";

  return (
    <div className="mt-4 grid gap-3 border-b border-neutral-800 pb-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-xs text-neutral-500">From</label>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onFrom(e.target.value)}
          style={{ colorScheme: "dark" }}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-neutral-500">To</label>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onTo(e.target.value)}
          style={{ colorScheme: "dark" }}
          className={inputClass}
        />
      </div>
    </div>
  );
}

const TOOLTIP_STYLE = {
  background: "#171717",
  border: "1px solid #262626",
  borderRadius: "12px",
  color: "#fff",
};

export default function Page() {
  const { user } = useAuth();
  const router = useRouter();

  // Pie: collection vs expenses
  const [financialPeriod, setFinancialPeriod] = useState<Period>("month");
  const [financialFrom, setFinancialFrom] = useState("");
  const [financialTo, setFinancialTo] = useState("");

  // Line chart: daily collection / expenses
  const [chartPeriod, setChartPeriod] = useState<Period>("month");
  const [chartFrom, setChartFrom] = useState("");
  const [chartTo, setChartTo] = useState("");

  // Bar chart: sales trend
  const [salesPeriod, setSalesPeriod] = useState<Period>("month");
  const [salesFrom, setSalesFrom] = useState("");
  const [salesTo, setSalesTo] = useState("");

  const [branchId, setBranchId] = useState("");

  const [expiryTab, setExpiryTab] = useState<ExpiryTab>("upcoming");
  const [expiryPage, setExpiryPage] = useState(1);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------------- FETCH ---------------- */

  const fetchDashboard = useCallback(async () => {
    if (financialPeriod === "custom" && (!financialFrom || !financialTo)) return;
    if (chartPeriod === "custom" && (!chartFrom || !chartTo)) return;
    if (salesPeriod === "custom" && (!salesFrom || !salesTo)) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      params.set("period", financialPeriod);
      if (financialPeriod === "custom") {
        params.set("from", financialFrom);
        params.set("to", financialTo);
      }

      params.set("chartPeriod", chartPeriod);
      if (chartPeriod === "custom") {
        params.set("chartFrom", chartFrom);
        params.set("chartTo", chartTo);
      }

      params.set("salesPeriod", salesPeriod);
      if (salesPeriod === "custom") {
        params.set("salesFrom", salesFrom);
        params.set("salesTo", salesTo);
      }

      if (branchId) params.set("branchId", branchId);

      params.set("expiryTab", expiryTab);
      params.set("expiryPage", String(expiryPage));

      const response = await fetch(
        `/api/dashboard/membership-sales?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load dashboard");
      }

      setData(result);

      if (result.scope.branchId && !branchId) {
        setBranchId(result.scope.branchId);
      }
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, [
    financialPeriod,
    financialFrom,
    financialTo,
    chartPeriod,
    chartFrom,
    chartTo,
    salesPeriod,
    salesFrom,
    salesTo,
    branchId,
    expiryTab,
    expiryPage,
  ]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleBranchChange = (value: string) => {
    setExpiryPage(1);
    setBranchId(value);
  };

  const handleExpiryTab = (tab: ExpiryTab) => {
    setExpiryTab(tab);
    setExpiryPage(1);
  };

  /* ---------------- NAVIGATION ---------------- */

  /**
   * Every card / chart opens /dashboard/overview/<type> which lists
   * the exact records behind the number. The branch filter and any
   * date range are passed along in the URL.
   */
  const go = (type: string, extra: Record<string, string> = {}) => {
    const params = new URLSearchParams(extra);

    if (branchId) params.set("branchId", branchId);

    const query = params.toString();

    router.push(`/dashboard/overview/${type}${query ? `?${query}` : ""}`);
  };

  const rangeParams = (period: Period, from: string, to: string) =>
    period === "custom" ? { period, from, to } : { period };

  const goToDay = (type: string, label: unknown) => {
    if (typeof label !== "string" || !label) return;
    go(type, { period: "custom", from: label, to: label });
  };

  /* ---------------- DERIVED ---------------- */

  const pieData = useMemo(
    () => [
      { name: "Collection", value: data?.financial.collectionPaise || 0 },
      { name: "Expenses", value: data?.financial.expensesPaise || 0 },
    ],
    [data]
  );

  const cards = [
    {
      key: "active-members",
      label: "Active Members",
      value: data?.cards.activeMembers ?? 0,
      detail: "Currently active memberships",
      icon: Users,
      style: "border-lime-500/20 bg-lime-500/5 text-lime-300",
    },
    {
      key: "new-members",
      label: "New Members This Month",
      value: data?.cards.newMembers ?? 0,
      detail: "Joined this month",
      icon: UserPlus,
      style: "border-sky-500/20 bg-sky-500/5 text-sky-300",
    },
    {
      key: "renewals",
      label: "Renewals This Month",
      value: data?.cards.monthRenewals ?? 0,
      detail: "Membership extensions this month",
      icon: TrendingUp,
      style: "border-blue-500/20 bg-blue-500/5 text-blue-300",
    },
    {
      key: "today-collection",
      label: "Today's Collection",
      value: formatMoney(data?.cards.todayCollectionPaise || 0),
      detail: "Payments received today",
      icon: IndianRupee,
      style: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
    },
    {
      key: "week-collection",
      label: "This Week's Collection",
      value: formatMoney(data?.cards.weekCollectionPaise || 0),
      detail: "Monday to today",
      icon: WalletCards,
      style: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
    },
    {
      key: "pending-dues",
      label: "Pending Dues",
      value: formatMoney(data?.cards.pendingDuePaise || 0),
      detail: "Outstanding invoice balance",
      icon: CreditCard,
      style: "border-amber-500/20 bg-amber-500/5 text-amber-300",
    },
    {
      key: "today-expiries",
      label: "Today's Expiries",
      value: data?.cards.todayPlanExpiry ?? 0,
      detail: "Memberships ending today",
      icon: CalendarClock,
      style: "border-red-500/20 bg-red-500/5 text-red-300",
    },
    {
      key: "present-today",
      label: "Today's Present Members",
      value: data?.cards.todayPresent ?? 0,
      detail: "Checked in today",
      icon: UserCheck,
      style: "border-violet-500/20 bg-violet-500/5 text-violet-300",
    },
  ];

  const expiry = data?.expiry;

  /* ---------------- RENDER ---------------- */

  return (
    <div className="min-h-screen bg-black p-5 text-white lg:p-6">
      <div className="mx-auto max-w-[1500px]">
        {/* HEADER */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Dashboard Overview
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Monitor members, collections, renewals and upcoming expiries.
              Click any card or chart to see the records behind it.
            </p>

            {user?.name && (
              <p className="mt-1 text-xs text-neutral-700">
                Signed in as {user.name}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data?.scope.canSelectBranch && (
              <select
                value={branchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="h-10 min-w-[180px] appearance-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 pr-9 text-sm text-neutral-300 outline-none transition focus:border-lime-400"
              >
                <option value="">All Branches</option>

                {data.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={fetchDashboard}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-sm text-neutral-300 transition hover:border-lime-400/50 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* KPI CARDS (all clickable) */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => go(card.key)}
                className={`group rounded-2xl border p-5 text-left transition hover:brightness-125 ${card.style}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                      {card.label}
                    </p>

                    <p className="mt-3 text-2xl font-bold tracking-tight text-white">
                      {loading && !data ? "—" : card.value}
                    </p>

                    <p className="mt-2 text-xs text-neutral-500">
                      {card.detail}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/30">
                      <Icon size={19} />
                    </div>

                    <ArrowUpRight
                      size={15}
                      className="text-neutral-600 transition group-hover:text-white"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* PIE + BIRTHDAYS */}

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 lg:p-6">
            <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CircleDollarSign size={19} className="text-lime-400" />
                  <h2 className="text-lg font-semibold">
                    Collection vs Expenses
                  </h2>
                </div>

                <p className="mt-1 text-sm text-neutral-500">
                  Click a slice or a card to open the records.
                </p>
              </div>

              <PeriodTabs
                options={FINANCIAL_PERIODS}
                value={financialPeriod}
                onChange={setFinancialPeriod}
              />
            </div>

            {financialPeriod === "custom" && (
              <CustomRange
                from={financialFrom}
                to={financialTo}
                onFrom={setFinancialFrom}
                onTo={setFinancialTo}
              />
            )}

            {data && (
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  {formatDate(data.financial.period.from)}
                  {" – "}
                  {formatDate(data.financial.period.to)}
                </span>

                <span>{data.scope.branchName}</span>
              </div>
            )}

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
                      onClick={(entry: any) => {
                        const range = rangeParams(
                          financialPeriod,
                          financialFrom,
                          financialTo
                        );
                        //@ts-ignore
                        if (entry?.name === "Expenses") go("expenses", range);
                        if (entry?.name === "Collection")
                        //@ts-ignore
                          go("collection", range);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name === "Collection" ? "#22c55e" : "#ef4444"
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) => formatMoney(Number(value))}
                      contentStyle={TOOLTIP_STYLE}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    go(
                      "collection",
                      //@ts-ignore
                      rangeParams(financialPeriod, financialFrom, financialTo)
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
                    {formatMoney(data?.financial.collectionPaise || 0)}
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    Click to view payments
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    go(
                      "expenses",
                      //@ts-ignore
                      rangeParams(financialPeriod, financialFrom, financialTo)
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
                    {formatMoney(data?.financial.expensesPaise || 0)}
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    Click to view expenses
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* BIRTHDAYS */}

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 lg:p-6">
            <div className="flex items-center gap-2">
              <Cake size={19} className="text-lime-400" />
              <h2 className="text-lg font-semibold">Upcoming Birthdays</h2>
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              Members celebrating within the next 28 days.
            </p>

            <div className="mt-5 space-y-2">
              {!data || data.upcomingBirthdays.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-neutral-800 text-sm text-neutral-600">
                  No upcoming birthdays.
                </div>
              ) : (
                data.upcomingBirthdays.map((birthday) => (
                  <button
                    key={birthday.id}
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/members/${birthday.id}`)
                    }
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent bg-black/20 p-3 text-left transition hover:border-lime-400/20 hover:bg-black/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {birthday.profileImage ? (
                        <img
                          src={birthday.profileImage}
                          alt={birthday.name}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-300">
                          {getInitials(birthday.name)}
                        </div>
                      )}

                      <p className="truncate text-sm font-medium text-white">
                        {birthday.name}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold text-lime-300">
                      {formatShortDate(birthday.birthdayDate)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        {/* EXPIRING + OVERDUE */}

        <section className="mt-5 rounded-3xl border border-neutral-800 bg-neutral-900">
          <div className="flex flex-col gap-4 border-b border-neutral-800 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div>
              <div className="flex items-center gap-2">
                <CalendarClock size={19} className="text-lime-400" />
                <h2 className="text-lg font-semibold">
                  Expiring &amp; Overdue Memberships
                </h2>
              </div>

              <p className="mt-1 text-sm text-neutral-500">
                {expiryTab === "upcoming"
                  ? `Ending within the next ${expiry?.days ?? 7} days.`
                  : `Expired in the last ${
                      expiry?.overdueLookbackDays ?? 60
                    } days and not renewed.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1.5 rounded-xl border border-neutral-800 bg-black/30 p-1">
                <button
                  type="button"
                  onClick={() => handleExpiryTab("upcoming")}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    expiryTab === "upcoming"
                      ? "bg-lime-400 text-black"
                      : "text-neutral-500 hover:text-white"
                  }`}
                >
                  Next 7 days ({expiry?.upcomingTotal ?? 0})
                </button>

                <button
                  type="button"
                  onClick={() => handleExpiryTab("overdue")}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    expiryTab === "overdue"
                      ? "bg-red-400 text-black"
                      : "text-neutral-500 hover:text-white"
                  }`}
                >
                  Overdue ({expiry?.overdueTotal ?? 0})
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  go(expiryTab === "overdue" ? "overdue" : "expiring")
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-800 px-3 text-xs text-neutral-300 transition hover:border-lime-400/50 hover:text-lime-300"
              >
                View all
                <ArrowUpRight size={13} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-neutral-800">
            {loading && !data ? (
              <div className="px-6 py-14 text-center text-sm text-neutral-600">
                Loading memberships...
              </div>
            ) : !expiry || expiry.items.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-lime-400/10 text-lime-300">
                  <CalendarDays size={19} />
                </div>

                <p className="mt-3 text-sm font-medium text-neutral-300">
                  {expiryTab === "upcoming"
                    ? "No memberships expiring soon."
                    : "No overdue memberships."}
                </p>
              </div>
            ) : (
              expiry.items.map((membership) => {
                const overdue = expiryTab === "overdue";

                const tone = overdue
                  ? "bg-red-500/10 text-red-300"
                  : membership.days <= 2
                  ? "bg-red-500/10 text-red-300"
                  : membership.days <= 4
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-lime-500/10 text-lime-300";

                return (
                  <button
                    key={membership.id}
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/members/${membership.memberId}`)
                    }
                    className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.02] lg:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {membership.profileImage ? (
                        <img
                          src={membership.profileImage}
                          alt={membership.name}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-300">
                          {getInitials(membership.name)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {membership.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-neutral-500">
                          {membership.serviceName} · {membership.packageName}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-5">
                      <div className="hidden text-right sm:block">
                        <p className="text-xs text-neutral-600">
                          {overdue ? "Expired" : "Expires"}
                        </p>

                        <p className="mt-1 text-sm font-medium text-neutral-300">
                          {formatDay(membership.endDate)}
                        </p>
                      </div>

                      <div
                        className={`min-w-[74px] rounded-xl px-3 py-2 text-center ${tone}`}
                      >
                        <p className="text-sm font-semibold">
                          {membership.days}
                        </p>

                        <p className="text-[10px] uppercase tracking-wide opacity-70">
                          {overdue ? "days overdue" : "days left"}
                        </p>
                      </div>

                      <ChevronRight
                        size={17}
                        className="text-neutral-700 transition group-hover:text-lime-400"
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {expiry && expiry.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-4 lg:px-6">
              <p className="text-xs text-neutral-600">
                Showing {(expiry.page - 1) * expiry.pageSize + 1} –{" "}
                {Math.min(expiry.page * expiry.pageSize, expiry.total)} of{" "}
                {expiry.total}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={expiry.page <= 1}
                  onClick={() =>
                    setExpiryPage((current) => Math.max(1, current - 1))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-black/20 text-neutral-500 transition hover:border-lime-400/40 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="min-w-16 text-center text-xs text-neutral-500">
                  Page {expiry.page} / {expiry.totalPages}
                </span>

                <button
                  type="button"
                  disabled={expiry.page >= expiry.totalPages}
                  onClick={() =>
                    setExpiryPage((current) =>
                      Math.min(expiry.totalPages, current + 1)
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-black/20 text-neutral-500 transition hover:border-lime-400/40 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* COLLECTION TREND */}

        <section className="mt-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-5 lg:p-6">
          <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={19} className="text-lime-400" />
                <h2 className="text-lg font-semibold">
                  Collection &amp; Expense Trend
                </h2>
              </div>

              <p className="mt-1 text-sm text-neutral-500">
                Click a point to see that day&apos;s collection.
              </p>
            </div>

            <PeriodTabs
              options={TREND_PERIODS}
              value={chartPeriod}
              onChange={setChartPeriod}
            />
          </div>

          {chartPeriod === "custom" && (
            <CustomRange
              from={chartFrom}
              to={chartTo}
              onFrom={setChartFrom}
              onTo={setChartTo}
            />
          )}

          {data && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                <CalendarDays size={13} />
                {formatDate(data.chart.period.from)}
                {" – "}
                {formatDate(data.chart.period.to)}
              </span>

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
            {loading && !data ? (
              <div className="flex h-full items-center justify-center text-sm text-neutral-600">
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data?.chart.data || []}
                  margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
                  onClick={(state: any) =>
                    goToDay("collection", state?.activeLabel)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />

                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={{ stroke: "#262626" }}
                    tickLine={false}
                  />

                  <YAxis
                    tickFormatter={(value) =>
                      formatMoneyCompact(Number(value))
                    }
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />

                  <Tooltip
                    labelFormatter={(value) => formatDate(String(value))}
                    formatter={(value, name) => [
                      formatMoney(Number(value)),
                      name,
                    ]}
                    contentStyle={TOOLTIP_STYLE}
                  />

                  <Line
                    type="monotone"
                    name="Collection"
                    dataKey="collectionPaise"
                    stroke="#a3e635"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />

                  <Line
                    type="monotone"
                    name="Expenses"
                    dataKey="expensesPaise"
                    stroke="#f87171"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* SALES TREND */}

        <section className="mt-5 rounded-3xl border border-neutral-800 bg-neutral-900 p-5 lg:p-6">
          <div className="flex flex-col gap-4 border-b border-neutral-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={19} className="text-sky-400" />
                <h2 className="text-lg font-semibold">Sales Trend</h2>
              </div>

              <p className="mt-1 text-sm text-neutral-500">
                Membership sales invoiced per day (new, renewals and upgrades).
                Click a bar to see that day&apos;s sales.
              </p>
            </div>

            <PeriodTabs
              options={TREND_PERIODS}
              value={salesPeriod}
              onChange={setSalesPeriod}
            />
          </div>

          {salesPeriod === "custom" && (
            <CustomRange
              from={salesFrom}
              to={salesTo}
              onFrom={setSalesFrom}
              onTo={setSalesTo}
            />
          )}

          {data && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                <CalendarDays size={13} />
                {formatDate(data.sales.period.from)}
                {" – "}
                {formatDate(data.sales.period.to)}
              </span>

              <button
                type="button"
                onClick={() =>
                  go(
                    "sales",

                    //@ts-ignore
                    rangeParams(salesPeriod, salesFrom, salesTo)
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-1.5 text-xs text-sky-300 transition hover:bg-sky-500/10"
              >
                {formatMoney(data.sales.totalPaise)} · {data.sales.count}{" "}
                invoice{data.sales.count === 1 ? "" : "s"}
                <ArrowUpRight size={13} />
              </button>
            </div>
          )}

          <div className="mt-4 h-[320px]">
            {loading && !data ? (
              <div className="flex h-full items-center justify-center text-sm text-neutral-600">
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.sales.data || []}
                  margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
                  onClick={(state: any) => goToDay("sales", state?.activeLabel)}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />

                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={{ stroke: "#262626" }}
                    tickLine={false}
                  />

                  <YAxis
                    tickFormatter={(value) =>
                      formatMoneyCompact(Number(value))
                    }
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />

                  <Tooltip
                    labelFormatter={(value) => formatDate(String(value))}
                    formatter={(value) => [formatMoney(Number(value)), "Sales"]}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "rgba(56,189,248,0.08)" }}
                  />

                  <Bar
                    dataKey="salesPaise"
                    name="Sales"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}