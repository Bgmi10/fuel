"use client";

import { useAuth } from "@/app/contexts/MemberAuthContext";
import { formatTime } from "@/app/utils/date";
import {
  Ban,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Loader2,
  Package,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
} from "react";

type SlotWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

type Slot = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  capacity: number;
  available: number;
  isFull: boolean;
  daysOfWeek?: SlotWeekday[];
};

const WEEKDAY_LABELS: Record<
  SlotWeekday,
  string
> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const JAVASCRIPT_DAY_TO_SLOT_DAY: Record<
  number,
  SlotWeekday
> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

function getSlotWeekday(
  date: Date
): SlotWeekday {
  return JAVASCRIPT_DAY_TO_SLOT_DAY[
    date.getDay()
  ];
}

function formatDateForApi(
  date: Date
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Page() {
  const router =
    useRouter();

  const {
    user: member,
  } = useAuth();

  const [
    step,
    setStep,
  ] = useState(1);

  const [
    selectedSubscription,
    setSelectedSubscription,
  ] = useState<any>(null);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState<Date | null>(
    null
  );

  const [
    slots,
    setSlots,
  ] = useState<Slot[]>([]);

  const [
    selectedSlot,
    setSelectedSlot,
  ] = useState<Slot | null>(
    null
  );

  const [
    slotsLoading,
    setSlotsLoading,
  ] = useState(false);

  const [
    bookingLoading,
    setBookingLoading,
  ] = useState(false);

  const [
    operatingDays,
    setOperatingDays,
  ] = useState<
    SlotWeekday[]
  >([]);

  const [
    operatingDaysLoading,
    setOperatingDaysLoading,
  ] = useState(false);

  const [
    operatingDaysError,
    setOperatingDaysError,
  ] = useState("");

  const steps = [
    "Membership",
    "Date",
    "Slot",
  ];

  const subscriptions =
    member?.subscriptions?.filter(
      (subscription: any) =>
        subscription.status ===
        "ACTIVE"
    ) || [];

  /*
   * Next 7 days.
   */
  const dates =
    useMemo(() => {
      return Array.from(
        {
          length: 7,
        },

        (_, index) => {
          const date =
            new Date();

          /*
           * Avoid midnight timezone
           * edge cases.
           */
          date.setHours(
            12,
            0,
            0,
            0
          );

          date.setDate(
            date.getDate() +
              index
          );

          return date;
        }
      );
    }, []);

  // =====================================================
  // OPERATING DAYS
  // =====================================================

  const fetchOperatingDays =
    async (
      subscriptionId: string
    ) => {
      try {
        setOperatingDaysLoading(
          true
        );

        setOperatingDaysError(
          ""
        );

        setOperatingDays(
          []
        );

        const response =
          await fetch(
            `/api/member/slot/book/operating-days?subscriptionId=${encodeURIComponent(
              subscriptionId
            )}`,
            {
              cache:
                "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Unable to load available days."
          );
        }

        setOperatingDays(
          Array.isArray(
            data.daysOfWeek
          )
            ? data.daysOfWeek
            : []
        );
      } catch (error) {
        console.error(
          "Operating days error:",
          error
        );

        setOperatingDaysError(
          error instanceof Error
            ? error.message
            : "Unable to load available days."
        );
      } finally {
        setOperatingDaysLoading(
          false
        );
      }
    };

  // =====================================================
  // STEP 1 - MEMBERSHIP
  // =====================================================

  const selectSubscription = (
    subscription: any
  ) => {
    setSelectedSubscription(
      subscription
    );

    /*
     * Reset any data from a
     * previously selected membership.
     */
    setSelectedDate(
      null
    );

    setSelectedSlot(
      null
    );

    setSlots([]);

    setOperatingDays(
      []
    );

    setOperatingDaysError(
      ""
    );
  };

  const continueToDateSelection =
    async () => {
      if (
        !selectedSubscription
          ?.id
      ) {
        return;
      }

      setStep(2);

      await fetchOperatingDays(
        selectedSubscription.id
      );
    };

  // =====================================================
  // STEP 2 - DATE
  // =====================================================

  const selectDate = (
    date: Date
  ) => {
    const weekday =
      getSlotWeekday(
        date
      );

    if (
      !operatingDays.includes(
        weekday
      )
    ) {
      return;
    }

    setSelectedDate(
      date
    );

    setSelectedSlot(
      null
    );

    setSlots([]);
  };

  // =====================================================
  // FETCH SLOTS
  // =====================================================

  const fetchSlots =
    async () => {
      if (
        !selectedSubscription
          ?.id ||
        !selectedDate
      ) {
        return false;
      }

      try {
        setSlotsLoading(
          true
        );

        setSelectedSlot(
          null
        );

        setSlots([]);

        const bookingDate =
          formatDateForApi(
            selectedDate
          );

        const response =
          await fetch(
            `/api/member/slot/book/available?subscriptionId=${encodeURIComponent(
              selectedSubscription.id
            )}&bookingDate=${encodeURIComponent(
              bookingDate
            )}`,
            {
              cache:
                "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Failed to load slots."
          );
        }

        setSlots(
          Array.isArray(data)
            ? data
            : data.slots ||
                []
        );

        return true;
      } catch (error) {
        console.error(
          "Fetch slots error:",
          error
        );

        setSlots([]);

        alert(
          error instanceof Error
            ? error.message
            : "Unable to load slots."
        );

        return false;
      } finally {
        setSlotsLoading(
          false
        );
      }
    };

  const continueToSlotSelection =
    async () => {
      if (
        !selectedDate
      ) {
        return;
      }

      /*
       * Go to Step 3 first so
       * loading state is visible.
       */
      setStep(3);

      await fetchSlots();
    };

  // =====================================================
  // STEP 3 - FINAL BOOKING
  // =====================================================

  const handleBooking =
    async () => {
      if (
        !member?.id ||
        !selectedSubscription
          ?.id ||
        !selectedDate ||
        !selectedSlot?.id
      ) {
        alert(
          "Please select a valid slot."
        );

        return;
      }

      try {
        setBookingLoading(
          true
        );

        const bookingDate =
          formatDateForApi(
            selectedDate
          );

        const response =
          await fetch(
            "/api/member/slot/book/validate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  memberId:
                    member.id,

                  subscriptionId:
                    selectedSubscription.id,

                  slotId:
                    selectedSlot.id,

                  bookingDate,
                }
              ),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data.valid ===
            false ||
          data.success ===
            false
        ) {
          alert(
            data.error ||
              data.message ||
              "Unable to book this session."
          );

          return;
        }

        alert(
          data.message ||
            "Booking confirmed successfully."
        );

        router.push(
          "/member/slot"
        );

        router.refresh();
      } catch (error) {
        console.error(
          "Booking error:",
          error
        );

        alert(
          "Something went wrong while booking your session."
        );
      } finally {
        setBookingLoading(
          false
        );
      }
    };

  return (
    <div className="space-y-6 text-white">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="
            flex h-10 w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-neutral-800
            bg-neutral-900
            text-white
            transition
            hover:bg-neutral-800
          "
        >
          ←
        </button>

        <div>
          <h1 className="text-2xl font-bold">
            Book Session
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            Reserve your next
            training slot
          </p>
        </div>
      </div>

      {/* ================================================= */}
      {/* STEP INDICATOR */}
      {/* ================================================= */}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-5 sm:p-6">
        <div className="mx-auto flex max-w-2xl items-start">
          {steps.map(
            (
              item,
              index
            ) => {
              const stepNumber =
                index + 1;

              const completed =
                step >
                stepNumber;

              const active =
                step ===
                stepNumber;

              return (
                <div
                  key={item}
                  className="flex flex-1 items-start"
                >
                  <div className="flex shrink-0 flex-col items-center">
                    <div
                      className={`
                        flex h-10 w-10
                        items-center
                        justify-center
                        rounded-full
                        text-sm
                        font-semibold
                        transition
                        ${
                          completed
                            ? "bg-lime-400 text-black"
                            : active
                            ? "border border-lime-400 bg-lime-400/10 text-lime-400"
                            : "bg-white/5 text-gray-500"
                        }
                      `}
                    >
                      {completed ? (
                        <Check
                          size={
                            16
                          }
                        />
                      ) : (
                        stepNumber
                      )}
                    </div>

                    <span
                      className={`
                        mt-2
                        whitespace-nowrap
                        text-xs
                        sm:text-sm
                        ${
                          active
                            ? "text-white"
                            : completed
                            ? "text-gray-300"
                            : "text-gray-500"
                        }
                      `}
                    >
                      {item}
                    </span>
                  </div>

                  {index <
                    steps.length -
                      1 && (
                    <div
                      className={`
                        mx-3 mt-5
                        h-px flex-1
                        sm:mx-6
                        ${
                          completed
                            ? "bg-lime-400/50"
                            : "bg-white/10"
                        }
                      `}
                    />
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* ================================================= */}
      {/* STEP 1 */}
      {/* MEMBERSHIP */}
      {/* ================================================= */}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Select Membership
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Choose the
              membership you want
              to use for this
              booking.
            </p>
          </div>

          {subscriptions.length ===
          0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <Package
                size={30}
                className="mx-auto text-gray-600"
              />

              <p className="mt-3 font-medium text-white">
                No active
                memberships
              </p>

              <p className="mt-1 text-sm text-gray-500">
                You don't
                currently have an
                active membership
                available for slot
                booking.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map(
                (
                  subscription: any
                ) => {
                  const selected =
                    selectedSubscription
                      ?.id ===
                    subscription.id;

                  return (
                    <button
                      key={
                        subscription.id
                      }
                      type="button"
                      onClick={() =>
                        selectSubscription(
                          subscription
                        )
                      }
                      className={`
                        w-full
                        rounded-2xl
                        border
                        p-5
                        text-left
                        transition-all
                        ${
                          selected
                            ? "border-lime-400 bg-lime-400/5"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Building2
                              size={
                                16
                              }
                              className="shrink-0 text-lime-400"
                            />

                            <span className="font-medium">
                              {subscription
                                .branch
                                ?.name ||
                                subscription.branchName}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-sm text-gray-300">
                            <Package
                              size={
                                16
                              }
                              className="mt-0.5 shrink-0"
                            />

                            <span>
                              {
                                subscription.serviceName
                              }

                              {
                                " • "
                              }

                              {subscription
                                .package
                                ?.name ||
                                subscription.packageName}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500">
                            Valid until{" "}
                            {new Date(
                              subscription.endDate
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month:
                                  "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>

                        {selected && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-400">
                            <Check
                              size={
                                16
                              }
                              className="text-black"
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}

          <button
            type="button"
            disabled={
              !selectedSubscription
            }
            onClick={
              continueToDateSelection
            }
            className="
              flex w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-lime-400
              py-3
              font-semibold
              text-black
              transition
              hover:bg-lime-300
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Continue

            <ChevronRight
              size={18}
            />
          </button>
        </div>
      )}

      {/* ================================================= */}
      {/* STEP 2 */}
      {/* DATE */}
      {/* ================================================= */}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              Select Date
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Choose a day that
              has an available
              session.
            </p>
          </div>

          {/* MEMBERSHIP SUMMARY */}

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10">
                <Package
                  size={18}
                  className="text-lime-400"
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-gray-500">
                  Membership
                </p>

                <p className="truncate text-sm font-semibold">
                  {selectedSubscription
                    ?.package?.name ||
                    selectedSubscription
                      ?.packageName}
                </p>

                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {selectedSubscription
                    ?.branch?.name ||
                    selectedSubscription
                      ?.branchName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep(1);

                setSelectedDate(
                  null
                );

                setSelectedSlot(
                  null
                );

                setSlots([]);
              }}
              className="shrink-0 text-sm font-medium text-lime-400"
            >
              Change
            </button>
          </div>

          {/* LOADING */}

          {operatingDaysLoading && (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-gray-400">
              <Loader2
                size={18}
                className="animate-spin text-lime-400"
              />

              Loading available
              days...
            </div>
          )}

          {/* ERROR */}

          {!operatingDaysLoading &&
            operatingDaysError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">
                  {
                    operatingDaysError
                  }
                </p>

                <button
                  type="button"
                  onClick={() =>
                    fetchOperatingDays(
                      selectedSubscription.id
                    )
                  }
                  className="mt-3 text-sm font-medium text-white underline"
                >
                  Try again
                </button>
              </div>
            )}

          {/* DAYS SUMMARY */}

          {!operatingDaysLoading &&
            !operatingDaysError &&
            operatingDays.length >
              0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/5 p-4">
                <CalendarDays
                  size={20}
                  className="mt-0.5 shrink-0 text-lime-400"
                />

                <div>
                  <p className="text-sm font-medium">
                    Available
                    session days
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {operatingDays.map(
                      (
                        day
                      ) => (
                        <span
                          key={
                            day
                          }
                          className="rounded-full border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 text-xs font-medium text-lime-400"
                        >
                          {
                            WEEKDAY_LABELS[
                              day
                            ]
                          }
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* NO DAYS */}

          {!operatingDaysLoading &&
            !operatingDaysError &&
            operatingDays.length ===
              0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <Ban
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-400"
                />

                <div>
                  <p className="font-medium text-amber-300">
                    No sessions
                    scheduled
                  </p>

                  <p className="mt-1 text-sm text-amber-100/60">
                    There are no
                    active session
                    days configured
                    for this
                    membership.
                  </p>
                </div>
              </div>
            )}

          {/* DATE GRID */}

          {!operatingDaysLoading &&
            !operatingDaysError &&
            operatingDays.length >
              0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {dates.map(
                  (
                    date,
                    index
                  ) => {
                    const weekday =
                      getSlotWeekday(
                        date
                      );

                    const isAvailable =
                      operatingDays.includes(
                        weekday
                      );

                    const isSelected =
                      selectedDate?.toDateString() ===
                      date.toDateString();

                    const dayName =
                      index ===
                      0
                        ? "Today"
                        : index ===
                          1
                        ? "Tomorrow"
                        : date.toLocaleDateString(
                            "en-US",
                            {
                              weekday:
                                "short",
                            }
                          );

                    return (
                      <button
                        key={formatDateForApi(
                          date
                        )}
                        type="button"
                        disabled={
                          !isAvailable
                        }
                        onClick={() =>
                          selectDate(
                            date
                          )
                        }
                        className={`
                          relative
                          overflow-hidden
                          rounded-2xl
                          border
                          p-4
                          text-center
                          transition-all
                          ${
                            isSelected
                              ? "border-lime-400 bg-lime-400/10 shadow-lg shadow-lime-400/5"
                              : isAvailable
                              ? "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-lime-400/40 hover:bg-white/[0.05]"
                              : "cursor-not-allowed border-white/5 bg-white/[0.015] opacity-40"
                          }
                        `}
                      >
                        {isSelected && (
                          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-lime-400">
                            <Check
                              size={
                                12
                              }
                              className="text-black"
                            />
                          </div>
                        )}

                        <p
                          className={`text-sm font-medium ${
                            isSelected
                              ? "text-lime-400"
                              : isAvailable
                              ? "text-gray-300"
                              : "text-gray-600"
                          }`}
                        >
                          {
                            dayName
                          }
                        </p>

                        <p
                          className={`mt-1 text-2xl font-bold ${
                            isAvailable
                              ? "text-white"
                              : "text-gray-600"
                          }`}
                        >
                          {date.getDate()}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {date.toLocaleDateString(
                            "en-US",
                            {
                              month:
                                "short",
                            }
                          )}
                        </p>

                        {!isAvailable && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] text-gray-600">
                            <Ban
                              size={
                                10
                              }
                            />

                            No session
                          </div>
                        )}

                        {isAvailable &&
                          !isSelected && (
                            <p className="mt-2 text-[10px] font-medium text-lime-400/80">
                              Available
                            </p>
                          )}
                      </button>
                    );
                  }
                )}
              </div>
            )}

          {/* SELECTED DATE */}

          {selectedDate && (
            <div className="flex items-start gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/10 p-4">
              <CalendarDays
                size={19}
                className="mt-0.5 shrink-0 text-lime-400"
              />

              <div>
                <p className="text-xs font-medium text-lime-400">
                  Selected Date
                </p>

                <p className="mt-1 font-medium">
                  {selectedDate.toLocaleDateString(
                    "en-US",
                    {
                      weekday:
                        "long",
                      day: "numeric",
                      month:
                        "long",
                      year: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ACTIONS */}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(1);

                setSelectedDate(
                  null
                );

                setSelectedSlot(
                  null
                );
              }}
              className="rounded-xl border border-white/10 bg-white/[0.03] py-3 font-medium transition hover:bg-white/[0.06]"
            >
              Back
            </button>

            <button
              type="button"
              disabled={
                !selectedDate
              }
              onClick={
                continueToSlotSelection
              }
              className="
                flex items-center
                justify-center
                gap-2
                rounded-xl
                bg-lime-400
                py-3
                font-semibold
                text-black
                transition
                hover:bg-lime-300
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Continue

              <ChevronRight
                size={18}
              />
            </button>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* STEP 3 */}
      {/* SLOT + BOOK */}
      {/* ================================================= */}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              Select Slot
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Choose your
              preferred session
              and book it.
            </p>
          </div>

          {/* SELECTED DATE SUMMARY */}

          {selectedDate && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10">
                  <CalendarDays
                    size={18}
                    className="text-lime-400"
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Booking Date
                  </p>

                  <p className="mt-0.5 text-sm font-semibold">
                    {selectedDate.toLocaleDateString(
                      "en-US",
                      {
                        weekday:
                          "long",
                        day: "numeric",
                        month:
                          "long",
                      }
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  bookingLoading
                }
                onClick={() => {
                  setStep(2);

                  setSelectedSlot(
                    null
                  );

                  setSlots([]);
                }}
                className="text-sm font-medium text-lime-400"
              >
                Change
              </button>
            </div>
          )}

          {/* SLOT LOADING */}

          {slotsLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-sm text-gray-400">
              <Loader2
                size={19}
                className="animate-spin text-lime-400"
              />

              Loading available
              slots...
            </div>
          ) : slots.length ===
            0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <Ban
                size={30}
                className="text-gray-600"
              />

              <p className="mt-3 font-medium">
                No slots
                available
              </p>

              <p className="mt-1 text-sm text-gray-500">
                There are no
                available sessions
                on the selected
                date.
              </p>

              <button
                type="button"
                onClick={() =>
                  setStep(2)
                }
                className="mt-4 text-sm font-medium text-lime-400"
              >
                Choose another date
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map(
                (
                  slot
                ) => {
                  const selected =
                    selectedSlot
                      ?.id ===
                    slot.id;

                  return (
                    <button
                      key={
                        slot.id
                      }
                      type="button"
                      disabled={
                        slot.isFull ||
                        bookingLoading
                      }
                      onClick={() =>
                        setSelectedSlot(
                          slot
                        )
                      }
                      className={`
                        w-full
                        rounded-2xl
                        border
                        p-5
                        text-left
                        transition-all
                        ${
                          selected
                            ? "border-lime-400 bg-lime-400/10"
                            : "border-white/10 bg-white/[0.03]"
                        }
                        ${
                          slot.isFull
                            ? "cursor-not-allowed opacity-50"
                            : "hover:border-white/20 hover:bg-white/[0.05]"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">
                            {
                              slot.name
                            }
                          </h3>

                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                            <Clock3
                              size={
                                15
                              }
                            />

                            {formatTime(
                              slot.startTime
                            )}

                            {
                              " - "
                            }

                            {formatTime(
                              slot.endTime
                            )}
                          </div>

                          {!slot.isFull && (
                            <p className="mt-3 text-xs text-gray-500">
                              {slot.available ??
                                0}{" "}
                              spots
                              available
                            </p>
                          )}
                        </div>

                        {slot.isFull ? (
                          <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                            Full
                          </span>
                        ) : selected ? (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-400">
                            <Check
                              size={
                                16
                              }
                              className="text-black"
                            />
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {/* SELECTED SLOT SUMMARY */}

          {selectedSlot && (
            <div className="flex items-start gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/[0.06] p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400 text-black">
                <Check
                  size={17}
                />
              </div>

              <div>
                <p className="text-xs font-medium text-lime-400">
                  Selected Session
                </p>

                <p className="mt-1 font-semibold">
                  {
                    selectedSlot.name
                  }
                </p>

                <p className="mt-1 text-sm text-gray-400">
                  {formatTime(
                    selectedSlot.startTime
                  )}

                  {" - "}

                  {formatTime(
                    selectedSlot.endTime
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ACTIONS */}

          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              disabled={
                bookingLoading
              }
              onClick={() => {
                setStep(2);

                setSelectedSlot(
                  null
                );

                setSlots([]);
              }}
              className="
                rounded-xl
                border
                border-white/10
                bg-white/[0.03]
                py-3
                font-medium
                transition
                hover:bg-white/[0.06]
                disabled:opacity-50
              "
            >
              Back
            </button>

            <button
              type="button"
              onClick={
                handleBooking
              }
              disabled={
                bookingLoading ||
                !selectedSlot
              }
              className="
                flex items-center
                justify-center
                gap-2
                rounded-xl
                bg-lime-400
                py-3
                font-semibold
                text-black
                transition
                hover:bg-lime-300
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {bookingLoading ? (
                <>
                  <Loader2
                    size={
                      17
                    }
                    className="animate-spin"
                  />

                  Booking...
                </>
              ) : (
                <>
                  <Check
                    size={
                      17
                    }
                  />

                  Book Session
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}