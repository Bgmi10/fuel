"use client";

import {
  Activity,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  RefreshCcw,
  RotateCcw,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  period: {
    key: Period;
    from: string;
    to: string;
  };

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

  summary: {
    newMemberships: number;
    renewals: number;
    totalMembershipSales: number;
    renewalRate: number;
  };

  services: Array<{
    serviceName: string;
    newCount: number;
    renewalCount: number;
    totalCount: number;
    renewalRate: number;
  }>;
};

const PERIODS: Array<{
  value: Period;
  label: string;
}> = [
  {
    value: "today",
    label: "Today",
  },
  {
    value: "week",
    label: "This Week",
  },
  {
    value: "month",
    label: "This Month",
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

export default function Page() {
  const { user } =
    useAuth();

  const [
    period,
    setPeriod,
  ] =
    useState<Period>(
      "month"
    );

  const [
    branchId,
    setBranchId,
  ] =
    useState("");

  const [
    customFrom,
    setCustomFrom,
  ] =
    useState("");

  const [
    customTo,
    setCustomTo,
  ] =
    useState("");

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
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const fetchDashboard =
    useCallback(
      async () => {
        if (
          period ===
            "custom" &&
          (
            !customFrom ||
            !customTo
          )
        ) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        try {
          const params =
            new URLSearchParams({
              period,
            });

          if (branchId) {
            params.set(
              "branchId",
              branchId
            );
          }

          if (
            period ===
            "custom"
          ) {
            params.set(
              "from",
              customFrom
            );

            params.set(
              "to",
              customTo
            );
          }

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
        } catch (requestError) {
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
        period,
        branchId,
        customFrom,
        customTo,
      ]
    );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const maxServiceCount =
    useMemo(
      () =>
        Math.max(
          1,
          ...(
            data?.services ||
            []
          ).map(
            (service) =>
              service.totalCount
          )
        ),
      [data]
    );

  const cards = [
    {
      label:
        "New Memberships",

      value:
        data?.summary
          .newMemberships ||
        0,

      detail:
        "First-time sales",

      icon:
        UserPlus,

      style:
        "border-lime-500/20 bg-lime-500/5 text-lime-300",
    },
    {
      label:
        "Renewals",

      value:
        data?.summary
          .renewals ||
        0,

      detail:
        "Membership extensions",

      icon:
        RotateCcw,

      style:
        "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
    },
    {
      label:
        "Total Sales",

      value:
        data?.summary
          .totalMembershipSales ||
        0,

      detail:
        "New + renewal",

      icon:
        ChartNoAxesCombined,

      style:
        "border-violet-500/20 bg-violet-500/5 text-violet-300",
    },
    {
      label:
        "Renewal Rate",

      value:
        `${
          data?.summary
            .renewalRate ||
          0
        }%`,

      detail:
        "Renewal share",

      icon:
        TrendingUp,

      style:
        "border-amber-500/20 bg-amber-500/5 text-amber-300",
    },
  ];

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Dashboard Overview
            </h1>

          </div>

          <button
            type="button"
            onClick={
              fetchDashboard
            }
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-sm text-neutral-300 transition hover:border-lime-400/50 hover:text-lime-300 disabled:opacity-50"
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

        <section className="mt-7 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-neutral-500">
                Sales Period
              </p>

              <div className="flex flex-wrap gap-2">
                {PERIODS.map(
                  (option) => (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        setPeriod(
                          option.value
                        )
                      }
                      className={`rounded-xl border px-4 py-2 text-sm transition ${
                        period ===
                        option.value
                          ? "border-lime-400 bg-lime-400/10 text-lime-300"
                          : "border-neutral-800 bg-black/30 text-neutral-400 hover:text-white"
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

            {data?.scope
              .canSelectBranch && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Branch
                </p>

                <div className="relative">
                  <Building2
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                  />

                  <select
                    value={
                      branchId
                    }
                    onChange={(
                      event
                    ) =>
                      setBranchId(
                        event.target
                          .value
                      )
                    }
                    className="h-10 w-full rounded-xl border border-neutral-800 bg-black pl-10 pr-3 text-sm outline-none focus:border-lime-400"
                  >
                    <option value="">
                      All Branches
                    </option>

                    {data.branches.map(
                      (branch) => (
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
              </div>
            )}
          </div>

          {period ===
            "custom" && (
            <div className="mt-4 grid gap-4 border-t border-neutral-800 pt-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs text-neutral-500">
                  From Date
                </label>

                <input
                style={{ 
                  colorScheme: "dark"
                }}
                  type="date"
                  value={
                    customFrom
                  }
                  max={
                    customTo ||
                    undefined
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomFrom(
                      event.target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-black px-4 text-sm outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-neutral-500">
                  To Date
                </label>

                <input
                
                style={{ 
                  colorScheme: "dark"
                }}
                  type="date"
                  value={
                    customTo
                  }
                  min={
                    customFrom ||
                    undefined
                  }
                  onChange={(
                    event
                  ) =>
                    setCustomTo(
                      event.target
                        .value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-black px-4 text-sm outline-none focus:border-lime-400"
                />
              </div>
            </div>
          )}

          {data && (
            <div className="mt-4 flex flex-wrap gap-5 border-t border-neutral-800 pt-4 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-2">
                <CalendarDays
                  size={14}
                />

                {formatDate(
                  data.period.from
                )}{" "}
                –{" "}
                {formatDate(
                  data.period.to
                )}
              </span>

              <span className="inline-flex items-center gap-2">
                <Building2
                  size={14}
                />

                {
                  data.scope
                    .branchName
                }
              </span>
            </div>
          )}
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

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
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                        {
                          card.label
                        }
                      </p>

                      <p className="mt-3 text-3xl font-bold text-white">
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

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/30">
                      <Icon
                        size={21}
                      />
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity
                  size={20}
                  className="text-lime-400"
                />

                <h2 className="text-lg font-semibold">
                  Membership Sales by
                  Service
                </h2>
              </div>

              <p className="mt-2 text-sm text-neutral-500">
                New and renewal counts
                for each service.
              </p>
            </div>

            <div className="flex gap-4 text-xs text-neutral-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-lime-400" />
                New
              </span>

              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                Renewal
              </span>
            </div>
          </div>

          <div className="mt-6">
            {loading &&
            !data ? (
              <div className="py-14 text-center text-sm text-neutral-500">
                Loading insights...
              </div>
            ) : !data ||
              data.services
                .length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 py-14 text-center text-sm text-neutral-500">
                No paid membership
                sales found for this
                period.
              </div>
            ) : (
              <div className="space-y-6">
                {data.services.map(
                  (service) => (
                    <div
                      key={
                        service.serviceName
                      }
                    >
                      <div className="mb-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {
                              service.serviceName
                            }
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {
                              service.totalCount
                            }{" "}
                            total sales
                          </p>
                        </div>

                        <div className="flex gap-4 text-xs">
                          <span className="text-lime-300">
                            {
                              service.newCount
                            }{" "}
                            new
                          </span>

                          <span className="text-cyan-300">
                            {
                              service.renewalCount
                            }{" "}
                            renewals
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {[
                          {
                            label:
                              "New",

                            count:
                              service.newCount,

                            color:
                              "bg-lime-400",
                          },
                          {
                            label:
                              "Renewal",

                            count:
                              service.renewalCount,

                            color:
                              "bg-cyan-400",
                          },
                        ].map(
                          (bar) => (
                            <div
                              key={
                                bar.label
                              }
                              className="flex items-center gap-3"
                            >
                              <span className="w-16 text-xs text-neutral-500">
                                {
                                  bar.label
                                }
                              </span>

                              <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/40">
                                <div
                                  className={`h-full rounded-full ${bar.color}`}
                                  style={{
                                    width: `${Math.max(
                                      bar.count >
                                        0
                                        ? 3
                                        : 0,
                                      (
                                        bar.count /
                                        maxServiceCount
                                      ) *
                                        100
                                    )}%`,
                                  }}
                                />
                              </div>

                              <span className="w-8 text-right text-xs font-semibold">
                                {
                                  bar.count
                                }
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
          <div className="border-b border-neutral-800 px-6 py-5">
            <h2 className="text-lg font-semibold">
              Service Sales Breakdown
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Counts come from paid
              initial membership
              invoices.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-black/30 text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-6 py-4 text-left font-medium">
                    Service
                  </th>

                  <th className="px-6 py-4 text-right font-medium">
                    New
                  </th>

                  <th className="px-6 py-4 text-right font-medium">
                    Renewals
                  </th>

                  <th className="px-6 py-4 text-right font-medium">
                    Total
                  </th>

                  <th className="px-6 py-4 text-right font-medium">
                    Renewal Rate
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800">
                {data?.services.map(
                  (service) => (
                    <tr
                      key={
                        service.serviceName
                      }
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4 font-medium">
                        {
                          service.serviceName
                        }
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="rounded-lg bg-lime-500/10 px-2.5 py-1 text-sm font-semibold text-lime-300">
                          {
                            service.newCount
                          }
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-sm font-semibold text-cyan-300">
                          {
                            service.renewalCount
                          }
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {
                          service.totalCount
                        }
                      </td>

                      <td className="px-6 py-4 text-right text-sm text-neutral-300">
                        {
                          service.renewalRate
                        }
                        %
                      </td>
                    </tr>
                  )
                )}

                {!loading &&
                  (
                    !data ||
                    data.services
                      .length ===
                      0
                  ) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-neutral-500"
                    >
                      No sales data
                      available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}