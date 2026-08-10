"use client";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Loader2,
  Save,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

type SubscriptionData = {
  id: string;
  memberId: string;
  packageName: string;
  serviceName: string;
  branchName: string;
  startDate: string;
  endDate: string;
  status:
    | "ACTIVE"
    | "EXPIRED"
    | "CANCELLED"
    | "FROZEN";
};

function formatDateInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  if (!year || !month || !day) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function calculateDuration(
  startDate: string,
  endDate: string
) {
  if (!startDate || !endDate) {
    return 0;
  }

  const [startYear, startMonth, startDay] =
    startDate.split("-").map(Number);

  const [endYear, endMonth, endDay] =
    endDate.split("-").map(Number);

  const start = Date.UTC(
    startYear,
    startMonth - 1,
    startDay
  );

  const end = Date.UTC(
    endYear,
    endMonth - 1,
    endDay
  );

  if (end < start) {
    return 0;
  }

  return (
    Math.floor(
      (end - start) /
        (24 * 60 * 60 * 1000)
    ) + 1
  );
}

export default function EditMembershipPage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
    membershipId: string;
  }>();

  const memberId = params.id;
  const subscriptionId =
    params.membershipId;

  const [subscription, setSubscription] =
    useState<SubscriptionData | null>(
      null
    );

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [initialStartDate, setInitialStartDate] =
    useState("");

  const [initialEndDate, setInitialEndDate] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const durationInDays = useMemo(
    () =>
      calculateDuration(
        startDate,
        endDate
      ),
    [startDate, endDate]
  );

  const hasChanges =
    startDate !== initialStartDate ||
    endDate !== initialEndDate;

  useEffect(() => {
    if (!subscriptionId) {
      return;
    }

    const controller =
      new AbortController();

    const fetchSubscription =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response = await fetch(
            `/api/subscriptions/${subscriptionId}`,
            {
              cache: "no-store",
              signal: controller.signal,
            }
          );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success ||
            !data.subscription
          ) {
            throw new Error(
              data.message ||
                "Unable to load membership."
            );
          }

          const currentSubscription =
            data.subscription as SubscriptionData;

          const formattedStartDate =
            formatDateInput(
              currentSubscription.startDate
            );

          const formattedEndDate =
            formatDateInput(
              currentSubscription.endDate
            );

          setSubscription(
            currentSubscription
          );

          setStartDate(
            formattedStartDate
          );

          setEndDate(formattedEndDate);

          setInitialStartDate(
            formattedStartDate
          );

          setInitialEndDate(
            formattedEndDate
          );
        } catch (fetchError) {
          if (
            fetchError instanceof
              DOMException &&
            fetchError.name ===
              "AbortError"
          ) {
            return;
          }

          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load membership."
          );
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setLoading(false);
          }
        }
      };

    void fetchSubscription();

    return () => {
      controller.abort();
    };
  }, [subscriptionId]);

  const handleUpdate = async () => {
    if (!subscriptionId) {
      return;
    }

    setError("");

    if (!startDate || !endDate) {
      setError(
        "Start date and end date are required."
      );
      return;
    }

    if (endDate < startDate) {
      setError(
        "End date cannot be before the start date."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/subscriptions/${subscriptionId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            startDate,
            endDate,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to update membership."
        );
      }

      alert(
        "Membership dates updated successfully."
      );

      router.push(
        `/dashboard/members/${memberId}/memberships`
      );

      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update membership."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 text-neutral-400">
          <Loader2
            size={20}
            className="animate-spin text-lime-400"
          />

          Loading membership...
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-400">
            {error ||
              "Membership was not found."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={saving}
            aria-label="Go back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-300 transition-colors hover:bg-neutral-900 hover:text-white disabled:opacity-50"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold">
              Edit Membership
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Update the membership access
              dates.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950">
          <div className="border-b border-neutral-800 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                  Membership
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  {subscription.packageName}
                </h2>

                <p className="mt-1 text-sm text-neutral-400">
                  {subscription.serviceName}
                  {" • "}
                  {subscription.branchName}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  subscription.status ===
                  "ACTIVE"
                    ? "border-lime-500/30 bg-lime-500/10 text-lime-400"
                    : subscription.status ===
                      "FROZEN"
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                    : subscription.status ===
                      "EXPIRED"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}
              >
                {subscription.status}
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Start date
                </label>

                <input
                  type="date"
                  value={startDate}
                  disabled={saving}
                  style={{ colorScheme: "dark" }}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-neutral-800 bg-black px-4 text-sm text-white outline-none transition-colors focus:border-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  End date
                </label>

                <input
                  type="date"
                  style={{ colorScheme: "dark" }}
                  value={endDate}
                  min={startDate || undefined}
                  disabled={saving}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-neutral-800 bg-black px-4 text-sm text-white outline-none transition-colors focus:border-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/5 p-4">
              <CalendarDays
                size={20}
                className="mt-0.5 shrink-0 text-lime-400"
              />

              <div>
                <p className="text-sm font-medium text-white">
                  Updated membership duration
                </p>

                <p className="mt-1 text-sm text-neutral-400">
                  {durationInDays > 0
                    ? `${durationInDays} calendar days, including the start and end dates.`
                    : "Select a valid date range."}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-amber-400"
              />

              <p className="text-sm leading-6 text-amber-100/80">
                This changes only the
                membership access period. It
                does not change the package
                price, invoice, payments, or
                session balance.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-neutral-800 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  router.back()
                }
                disabled={saving}
                className="h-11 rounded-xl border border-neutral-700 bg-neutral-900 px-5 font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                disabled={
                  saving ||
                  !hasChanges ||
                  !startDate ||
                  !endDate ||
                  endDate < startDate
                }
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 font-semibold text-black transition-colors hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={17} />
                )}

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}