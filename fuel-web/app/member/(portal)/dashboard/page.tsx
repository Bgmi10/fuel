"use client";

import {
  Apple,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Dumbbell,
  Flame,
  Loader2,
  MapPin,
  RefreshCcw,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
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
  useAuth,
} from "@/app/contexts/MemberAuthContext";

/*
 * Change only this constant when your
 * actual food tracker page uses a
 * different URL.
 */
const FOOD_LOG_ROUTE =
  "/member/nutrition/food-tracker";

const WORKOUT_ROUTE =
  "/member/workout-plans";

type DashboardData = {
  member: {
    id: string;
    name: string;
    profileImage:
      | string
      | null;
    onBoardCompleted:
      boolean;
  };

  membershipSummary: {
    activeCount: number;

    nextExpiry: {
      subscriptionId:
        string;
      packageName:
        string;
      endDate: string;
      daysRemaining:
        number;
    } | null;
  };

  memberships: Array<{
    id: string;
    serviceName: string;
    packageName: string;
    branchName: string;

    usageType:
      | "DURATION_BASED"
      | "SESSION_BASED";

    totalSessions:
      | number
      | null;

    remainingSessions:
      | number
      | null;

    usedSessions:
      | number
      | null;

    startDate: string;
    endDate: string;

    status:
      | "ACTIVE"
      | "FROZEN"
      | "EXPIRED"
      | "CANCELLED";

    daysRemaining:
      number;
  }>;

  paymentSummary: {
    outstandingBalance:
      number;

    outstandingInvoiceCount:
      number;

    invoices: Array<{
      id: string;
      invoiceNumber: string;
      serviceName: string;
      packageName: string;
      balanceAmount: number;
      finalAmount: number;
      paidAmount: number;
      status: string;
      createdAt: string;
    }>;

    latestPayment: {
      id: string;
      receiptNumber: string;
      amount: number;
      paymentMode: string;
      paidAt: string;

      invoice: {
        packageName: string;
        serviceName: string;
      };
    } | null;
  };

  nextBooking: {
    id: string;
    bookingDate: string;
    resolvedBookingDay:
      string;
    status: string;

    slot: {
      id: string;
      name: string;
      startTime: string;
      endTime: string;
    };

    branch: {
      id: string;
      name: string;
    };

    package: {
      id: string;
      name: string;

      service: {
        id: string;
        name: string;
      };
    };
  } | null;

  fitness: {
    latest: {
      id: string;
      weight:
        | number
        | null;
      height:
        | number
        | null;
      bmi:
        | number
        | null;
      bodyFatPercentage:
        | number
        | null;
      assessmentDate:
        string;
    } | null;

    previous: {
      id: string;
      weight:
        | number
        | null;
      height:
        | number
        | null;
      bmi:
        | number
        | null;
      bodyFatPercentage:
        | number
        | null;
      assessmentDate:
        string;
    } | null;

    weightChange:
      | number
      | null;

    bodyFatChange:
      | number
      | null;
  };

  nutrition: {
    plan: {
      id: string;
      title:
        | string
        | null;
      targetCalories:
        number;
      targetProtein:
        number;
      targetCarbs:
        number;
      targetFat:
        number;
      macroDistributionType:
        "GRAMS" |
        "PERCENTAGE";
      targetProteinPercentage:
        | number
        | null;
      targetCarbsPercentage:
        | number
        | null;
      targetFatPercentage:
        | number
        | null;
      startDate: string;
      endDate: string;
    } | null;

    logged: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };

    mealCount: number;
    foodItemCount: number;
  };

  todayWorkout: {
    planId: string;
    planTitle: string;
    description:
      | string
      | null;
    dayId: string;
    dayNumber: number;
    dayName: string;
    exerciseCount:
      number;

    exercises: Array<{
      id: string;
      exerciseName: string;
      sets:
        | number
        | null;
      reps:
        | number
        | null;
      weight:
        | number
        | null;
      restSeconds:
        | number
        | null;
      notes:
        | string
        | null;
      sortOrder: number;
    }>;
  } | null;
};

const formatMoney = (
  value: number
) =>
  new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits:
        0,
    }
  ).format(
    value / 100
  );

const formatDate = (
  value:
    | string
    | null
    | undefined
) => {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const formatBookingDate = (
  dateKey: string
) =>
  new Date(
    `${dateKey}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
    }
  );

const percentage = (
  current: number,
  target: number
) => {
  if (
    target <= 0 ||
    current <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (
        current /
        target
      ) * 100
    )
  );
};

const metricValue = (
  value:
    | number
    | null
    | undefined,
  suffix: string
) =>
  value === null ||
  value === undefined
    ? "—"
    : `${value} ${suffix}`;

const DashboardPage = () => {
  const router =
    useRouter();

  const {
    user: member,
    loading:
      authLoading,
  } = useAuth();

  const [
    dashboard,
    setDashboard,
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

  const [
    greeting,
    setGreeting,
  ] =
    useState(
      "Welcome"
    );

  const fetchDashboard =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/member/dashboard",
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

          setDashboard(
            result
          );
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
      []
    );

  useEffect(() => {
    const hour =
      Number(
        new Intl.DateTimeFormat(
          "en-IN",
          {
            timeZone:
              "Asia/Kolkata",
            hour:
              "2-digit",
            hour12:
              false,
          }
        ).format(
          new Date()
        )
      );

    if (
      hour >= 5 &&
      hour < 12
    ) {
      setGreeting(
        "Good Morning"
      );
    } else if (
      hour >= 12 &&
      hour < 17
    ) {
      setGreeting(
        "Good Afternoon"
      );
    } else if (
      hour >= 17 &&
      hour < 21
    ) {
      setGreeting(
        "Good Evening"
      );
    } else {
      setGreeting(
        "Good Night"
      );
    }
  }, []);

  useEffect(() => {
    if (
      !authLoading &&
      member
    ) {
      fetchDashboard();
    }

    if (
      !authLoading &&
      !member
    ) {
      setLoading(false);
    }
  }, [
    authLoading,
    member,
    fetchDashboard,
  ]);

  const nutritionProgress =
    useMemo(() => {
      const plan =
        dashboard?.nutrition
          .plan;

      const logged =
        dashboard?.nutrition
          .logged;

      if (
        !plan ||
        !logged
      ) {
        return null;
      }

      return {
        calories:
          percentage(
            logged.calories,
            plan.targetCalories
          ),

        protein:
          percentage(
            logged.protein,
            plan.targetProtein
          ),

        carbs:
          percentage(
            logged.carbs,
            plan.targetCarbs
          ),

        fat:
          percentage(
            logged.fat,
            plan.targetFat
          ),
      };
    }, [dashboard]);

  const primaryMembership =
    dashboard
      ?.memberships[0] ||
    null;

  const latestFitness =
    dashboard?.fitness
      .latest ||
    null;

  const weightChange =
    dashboard?.fitness
      .weightChange ??
    null;

  const bodyFatChange =
    dashboard?.fitness
      .bodyFatChange ??
    null;

  if (
    authLoading ||
    loading
  ) {
    return (
      <div className="flex min-h-[480px] items-center justify-center">
        <Loader2
          size={34}
          className="animate-spin text-lime-400"
        />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
        Please sign in to view
        your dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-lime-400">
            {greeting}
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white">
            {dashboard?.member
              .name ||
              member.name}
          </h1>

          <p className="mt-2 text-sm text-neutral-400">
            Here is your fitness,
            nutrition and workout
            overview for today.
          </p>
        </div>

        <button
          type="button"
          onClick={
            fetchDashboard
          }
          className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-neutral-300 transition hover:border-lime-400/40 hover:text-lime-300"
        >
          <RefreshCcw
            size={16}
          />

          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* COMPACT MEMBER SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

          <p className="mt-4 text-3xl font-bold text-white">
            {dashboard
              ?.membershipSummary
              .activeCount ||
              0}
          </p>

          <p className="mt-1 text-sm text-neutral-400">
            Active
            memberships
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <WalletCards
              size={21}
              className={
                (
                  dashboard
                    ?.paymentSummary
                    .outstandingBalance ||
                  0
                ) > 0
                  ? "text-red-400"
                  : "text-emerald-400"
              }
            />

            <span className="text-xs text-neutral-500">
              Payment
            </span>
          </div>

          <p
            className={`mt-4 text-2xl font-bold ${
              (
                dashboard
                  ?.paymentSummary
                  .outstandingBalance ||
                0
              ) > 0
                ? "text-red-400"
                : "text-white"
            }`}
          >
            {formatMoney(
              dashboard
                ?.paymentSummary
                .outstandingBalance ||
                0
            )}
          </p>

          <p className="mt-1 text-sm text-neutral-400">
            {dashboard
              ?.paymentSummary
              .outstandingInvoiceCount ||
            0}{" "}
            outstanding invoice
            {(
              dashboard
                ?.paymentSummary
                .outstandingInvoiceCount ||
              0
            ) === 1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <CalendarDays
              size={21}
              className="text-violet-400"
            />

            <span className="text-xs text-neutral-500">
              Next Expiry
            </span>
          </div>

          <p className="mt-4 text-2xl font-bold text-white">
            {dashboard
              ?.membershipSummary
              .nextExpiry
              ?.daysRemaining ??
              "—"}
          </p>

          <p className="mt-1 text-sm text-neutral-400">
            {dashboard
              ?.membershipSummary
              .nextExpiry
              ? "days remaining"
              : "No active membership"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <Clock3
              size={21}
              className="text-cyan-400"
            />

            <span className="text-xs text-neutral-500">
              Next Booking
            </span>
          </div>

          <p className="mt-4 truncate text-lg font-bold text-white">
            {dashboard
              ?.nextBooking
              ?.slot.name ||
              "No booking"}
          </p>

          <p className="mt-1 text-sm text-neutral-400">
            {dashboard
              ?.nextBooking
              ? formatBookingDate(
                  dashboard
                    .nextBooking
                    .resolvedBookingDay
                )
              : "Book your next session"}
          </p>
        </div>
      </div>

      {/* MEMBERSHIP + BOOKING SMALL SECTION */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Membership Overview
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Current access and
                remaining validity.
              </p>
            </div>

            <Dumbbell
              size={22}
              className="text-lime-400"
            />
          </div>

          {primaryMembership ? (
            <div className="mt-5">
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">
                      {
                        primaryMembership
                          .packageName
                      }
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        primaryMembership
                          .status ===
                        "ACTIVE"
                          ? "bg-lime-400/10 text-lime-300"
                          : "bg-blue-400/10 text-blue-300"
                      }`}
                    >
                      {
                        primaryMembership
                          .status
                      }
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-neutral-400">
                    {
                      primaryMembership
                        .serviceName
                    }
                  </p>

                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-neutral-500">
                    <MapPin
                      size={13}
                    />

                    {
                      primaryMembership
                        .branchName
                    }
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  {primaryMembership
                    .usageType ===
                  "SESSION_BASED" ? (
                    <>
                      <p className="text-2xl font-bold text-violet-300">
                        {
                          primaryMembership
                            .remainingSessions
                        }
                      </p>

                      <p className="text-xs text-neutral-500">
                        of{" "}
                        {
                          primaryMembership
                            .totalSessions
                        }{" "}
                        sessions remaining
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-cyan-300">
                        Unlimited Access
                      </p>

                      <p className="text-xs text-neutral-500">
                        Until expiry
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-black/20 p-4">
                  <p className="text-xs text-neutral-500">
                    Start Date
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {formatDate(
                      primaryMembership
                        .startDate
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-black/20 p-4">
                  <p className="text-xs text-neutral-500">
                    End Date
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {formatDate(
                      primaryMembership
                        .endDate
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-black/20 p-4">
                  <p className="text-xs text-neutral-500">
                    Remaining
                  </p>

                  <p className="mt-2 text-sm font-semibold text-lime-300">
                    {
                      primaryMembership
                        .daysRemaining
                    }{" "}
                    days
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-neutral-500">
              No active membership
              found.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Upcoming Session
            </h2>

            <Clock3
              size={20}
              className="text-cyan-400"
            />
          </div>

          {dashboard
            ?.nextBooking ? (
            <div className="mt-5">
              <p className="text-lg font-semibold text-white">
                {
                  dashboard
                    .nextBooking
                    .slot.name
                }
              </p>

              <p className="mt-2 text-sm text-neutral-400">
                {
                  dashboard
                    .nextBooking
                    .package
                    .service.name
                }
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <p className="flex items-center gap-2 text-neutral-300">
                  <CalendarDays
                    size={15}
                    className="text-neutral-500"
                  />

                  {formatBookingDate(
                    dashboard
                      .nextBooking
                      .resolvedBookingDay
                  )}
                </p>

                <p className="flex items-center gap-2 text-neutral-300">
                  <Clock3
                    size={15}
                    className="text-neutral-500"
                  />

                  {
                    dashboard
                      .nextBooking
                      .slot
                      .startTime
                  }{" "}
                  –{" "}
                  {
                    dashboard
                      .nextBooking
                      .slot.endTime
                  }
                </p>

                <p className="flex items-center gap-2 text-neutral-300">
                  <MapPin
                    size={15}
                    className="text-neutral-500"
                  />

                  {
                    dashboard
                      .nextBooking
                      .branch.name
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 py-10 text-center">
              <p className="text-sm text-neutral-400">
                No upcoming booking.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* FITNESS + NUTRITION */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <Scale
                  size={22}
                  className="text-lime-400"
                />

                Fitness Progress
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Based on your latest
                fitness assessment.
              </p>
            </div>

            {latestFitness && (
              <span className="text-xs text-neutral-500">
                {formatDate(
                  latestFitness
                    .assessmentDate
                )}
              </span>
            )}
          </div>

          {latestFitness ? (
            <div className="mt-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-black/20 p-4">
                  <p className="text-xs text-neutral-500">
                    Weight
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {metricValue(
                      latestFitness
                        .weight,
                      "kg"
                    )}
                  </p>

                  {weightChange !==
                    null && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-neutral-400">
                      {weightChange <
                      0 ? (
                        <TrendingDown
                          size={13}
                          className="text-emerald-400"
                        />
                      ) : (
                        <TrendingUp
                          size={13}
                          className="text-amber-400"
                        />
                      )}

                      {weightChange >
                      0
                        ? "+"
                        : ""}
                      {
                        weightChange
                      }{" "}
                      kg from previous
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-black/20 p-4">
                  <p className="text-xs text-neutral-500">
                    Body Fat
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {metricValue(
                      latestFitness
                        .bodyFatPercentage,
                      "%"
                    )}
                  </p>

                  {bodyFatChange !==
                    null && (
                    <p className="mt-2 text-xs text-neutral-400">
                      {bodyFatChange >
                      0
                        ? "+"
                        : ""}
                      {
                        bodyFatChange
                      }
                      % from previous
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-black/20 p-4">
                  <p className="text-xs text-neutral-500">
                    BMI
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {latestFitness
                      .bmi ??
                      "—"}
                  </p>

                  <p className="mt-2 text-xs text-neutral-500">
                    Latest recorded
                    value
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 py-12 text-center">
              <Target
                size={28}
                className="mx-auto text-neutral-700"
              />

              <p className="mt-3 text-sm text-neutral-400">
                No fitness assessment
                recorded yet.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <Apple
                  size={22}
                  className="text-emerald-400"
                />

                Nutrition Progress
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Today’s food log
                compared with your
                active nutrition plan.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  FOOD_LOG_ROUTE
                )
              }
              className="cursor-pointer inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 text-sm font-semibold text-black transition hover:bg-lime-300"
            >
              <Flame
                size={16}
              />

              Log <span>Food</span> 
            </button>
          </div>

          {dashboard
            ?.nutrition.plan ? (
            <div className="mt-6 space-y-4">
              {[
                {
                  label:
                    "Calories",

                  current:
                    dashboard
                      .nutrition
                      .logged
                      .calories,

                  target:
                    dashboard
                      .nutrition
                      .plan
                      .targetCalories,

                  unit:
                    "kcal",

                  progress:
                    nutritionProgress
                      ?.calories ||
                    0,

                  bar:
                    "bg-lime-400",
                },
                {
                  label:
                    "Protein",

                  current:
                    dashboard
                      .nutrition
                      .logged
                      .protein,

                  target:
                    dashboard
                      .nutrition
                      .plan
                      .targetProtein,

                  unit:
                    "g",

                  progress:
                    nutritionProgress
                      ?.protein ||
                    0,

                  bar:
                    "bg-blue-400",
                },
                {
                  label:
                    "Carbs",

                  current:
                    dashboard
                      .nutrition
                      .logged
                      .carbs,

                  target:
                    dashboard
                      .nutrition
                      .plan
                      .targetCarbs,

                  unit:
                    "g",

                  progress:
                    nutritionProgress
                      ?.carbs ||
                    0,

                  bar:
                    "bg-amber-400",
                },
                {
                  label:
                    "Fat",

                  current:
                    dashboard
                      .nutrition
                      .logged.fat,

                  target:
                    dashboard
                      .nutrition
                      .plan
                      .targetFat,

                  unit:
                    "g",

                  progress:
                    nutritionProgress
                      ?.fat ||
                    0,

                  bar:
                    "bg-violet-400",
                },
              ].map(
                (item) => (
                  <div
                    key={
                      item.label
                    }
                  >
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-neutral-300">
                        {
                          item.label
                        }
                      </span>

                      <span className="text-xs text-neutral-500">
                        {
                          item.current
                        }{" "}
                        /{" "}
                        {
                          item.target
                        }{" "}
                        {
                          item.unit
                        }
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-black/30">
                      <div
                        className={`h-full rounded-full transition-all ${item.bar}`}
                        style={{
                          width: `${item.progress}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}

              <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4 text-xs text-neutral-500">
                <span>
                  {
                    dashboard
                      .nutrition
                      .mealCount
                  }{" "}
                  meals logged
                </span>

                <span>
                  {
                    dashboard
                      .nutrition
                      .foodItemCount
                  }{" "}
                  food items
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 py-10 text-center">
              <Apple
                size={28}
                className="mx-auto text-neutral-700"
              />

              <p className="mt-3 text-sm text-neutral-400">
                No active nutrition
                plan found.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    FOOD_LOG_ROUTE
                  )
                }
                className="mt-4 text-sm font-medium text-lime-400 hover:text-lime-300"
              >
                Open Food Log
              </button>
            </div>
          )}
        </section>
      </div>

      {/* TODAY WORKOUT */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Dumbbell
                size={22}
                className="text-orange-400"
              />

              Today’s Workout
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Today’s workout is
              selected from the active
              plan cycle.
            </p>
          </div>

          {dashboard
            ?.todayWorkout && (
            <button
              type="button"
              onClick={() =>
                router.push(
                  WORKOUT_ROUTE
                )
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 text-sm font-medium text-orange-300 transition hover:bg-orange-400/20"
            >
              View Full Workout

              <ChevronRight
                size={16}
              />
            </button>
          )}
        </div>

        {dashboard
          ?.todayWorkout ? (
          <div className="mt-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-orange-400/20 bg-orange-400/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-orange-300/70">
                  {
                    dashboard
                      .todayWorkout
                      .planTitle
                  }
                </p>

                <h3 className="mt-2 text-xl font-semibold text-white">
                  {
                    dashboard
                      .todayWorkout
                      .dayName
                  }
                </h3>
              </div>

              <span className="w-fit rounded-full bg-black/30 px-3 py-1.5 text-xs font-medium text-neutral-300">
                {
                  dashboard
                    .todayWorkout
                    .exerciseCount
                }{" "}
                exercises
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dashboard
                .todayWorkout
                .exercises
                .slice(
                  0,
                  6
                )
                .map(
                  (
                    exercise,
                    index
                  ) => (
                    <div
                      key={
                        exercise.id
                      }
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-400/10 text-xs font-semibold text-orange-300">
                          {index + 1}
                        </span>

                        <div>
                          <p className="font-medium text-white">
                            {
                              exercise.exerciseName
                            }
                          </p>

                          <p className="mt-2 text-xs text-neutral-500">
                            {exercise.sets ??
                              "—"}{" "}
                            sets
                            {" · "}
                            {exercise.reps ??
                              "—"}{" "}
                            reps
                            {exercise.weight !==
                              null &&
                              ` · ${exercise.weight} kg`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 py-12 text-center">
            <Dumbbell
              size={30}
              className="mx-auto text-neutral-700"
            />

            <p className="mt-3 text-sm text-neutral-400">
              No active workout plan
              is available today.
            </p>
          </div>
        )}
      </section>

     
    </div>
  );
};

export default DashboardPage;