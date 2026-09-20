"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Dumbbell,
  Infinity as InfinityIcon,
} from "lucide-react";

import { FreezeModal } from "../Freezemodal";

const BUSINESS_TIMEZONE = "Asia/Kolkata";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function getCalendarDayNumber(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(
    parts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value
  );

  const day = Number(
    parts.find((part) => part.type === "day")?.value
  );

  return Math.floor(
    Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY
  );
}

function calculateInclusiveDaysLeft(
  endDate: Date,
  referenceDate = new Date()
) {
  const today = getCalendarDayNumber(referenceDate);
  const end = getCalendarDayNumber(endDate);

  return Math.max(0, end - today + 1);
}

function formatCurrency(value: unknown) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(
  value: string | Date | null | undefined
) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleDateString("en-IN");
}

function formatDateTime(
  value: string | Date | null | undefined
) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString("en-IN", {
    timeZone: BUSINESS_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ============================================================
   TRANSFER DETAILS
   ============================================================ */

function TransferDetails({
  transfer,
  type,
}: {
  transfer: any;
  type: "incoming" | "outgoing";
}) {
  if (!transfer) {
    return null;
  }

  const person =
    type === "incoming"
      ? transfer.fromMember
      : transfer.toMember;

  return (
    <div className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-300">
            {type === "incoming"
              ? "Received through membership transfer"
              : "Membership transferred"}
          </p>

          <p className="mt-1 text-sm text-neutral-400">
            {type === "incoming" ? (
              <>
                Transferred from{" "}
                <span className="font-medium text-white">
                  {person?.name}
                </span>{" "}
                by{" "}
                <span className="font-medium text-white">
                  {transfer.transferredBy?.name}
                </span>
                .
              </>
            ) : (
              <>
                Transferred to{" "}
                <span className="font-medium text-white">
                  {person?.name}
                </span>{" "}
                by{" "}
                <span className="font-medium text-white">
                  {transfer.transferredBy?.name}
                </span>
                .
              </>
            )}
          </p>
        </div>

        <p className="shrink-0 text-xs text-neutral-500">
          {formatDateTime(transfer.createdAt)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xs text-neutral-500">
            {type === "incoming"
              ? "Previous member"
              : "Receiving member"}
          </p>

          <p className="mt-1 text-sm font-medium text-white">
            {person?.name || "Unknown"}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            {person?.phone || "No phone"}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xs text-neutral-500">
            Remaining duration
          </p>

          <p className="mt-1 text-sm font-medium text-white">
            {transfer.remainingDays != null
              ? `${transfer.remainingDays} days`
              : "Not recorded"}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            At the time of transfer
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xs text-neutral-500">
            Applied slab
          </p>

          <p className="mt-1 text-sm font-medium text-white">
            {transfer.feeSlabLabel || "Legacy manual fee"}
          </p>

          {transfer.feeSlabMinDays != null &&
            transfer.feeSlabMaxDays != null && (
              <p className="mt-1 text-xs text-neutral-500">
                {transfer.feeSlabMinDays}–
                {transfer.feeSlabMaxDays} days
              </p>
            )}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xs text-neutral-500">
            Transferred by
          </p>

          <p className="mt-1 text-sm font-medium text-white">
            {transfer.transferredBy?.name || "Unknown"}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            {transfer.transferredBy?.role || "Unknown"}
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-800 bg-black/30">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-neutral-500">
              Base transfer fee
            </p>

            <p className="mt-1 font-medium text-white">
              ₹
              {formatCurrency(
                transfer.baseTransferFee ??
                  transfer.transferFee
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-neutral-500">
              CGST{" "}
              {transfer.cgstPercentage != null &&
                `(${transfer.cgstPercentage}%)`}
            </p>

            <p className="mt-1 font-medium text-white">
              ₹{formatCurrency(transfer.cgstAmount)}
            </p>
          </div>

          <div>
            <p className="text-xs text-neutral-500">
              SGST{" "}
              {transfer.sgstPercentage != null &&
                `(${transfer.sgstPercentage}%)`}
            </p>

            <p className="mt-1 font-medium text-white">
              ₹{formatCurrency(transfer.sgstAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950/70 px-4 py-3">
          <p className="text-sm font-medium text-neutral-300">
            Total transfer fee
          </p>

          <p className="text-lg font-bold text-lime-400">
            ₹{formatCurrency(transfer.transferFee)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xs text-neutral-500">
            Payment mode
          </p>

          <p className="mt-1 text-sm text-white">
            {transfer.paymentMode || "Not recorded"}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xs text-neutral-500">
            Amount collected
          </p>

          <p className="mt-1 text-sm text-white">
            ₹{formatCurrency(transfer.amountCollected)}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xs text-neutral-500">
            Transfer date
          </p>

          <p className="mt-1 text-sm text-white">
            {formatDateTime(transfer.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-neutral-800 bg-black/30 p-3">
        <p className="text-xs text-neutral-500">
          Transfer reason
        </p>

        <p className="mt-1 break-words text-sm text-white">
          {transfer.reason || "Not provided"}
        </p>
      </div>

      {transfer.notes && (
        <div className="mt-3 rounded-xl border border-neutral-800 bg-black/30 p-3">
          <p className="text-xs text-neutral-500">
            Notes
          </p>

          <p className="mt-1 break-words text-sm text-white">
            {transfer.notes}
          </p>
        </div>
      )}
    </div>
  );
}

export default function MembershipsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [member, setMember] = useState<any>(null);

  const [activeSubscriptions, setActiveSubscriptions] =
    useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [openFreezeModal, setOpenFreezeModal] =
    useState(false);

  const [selectedSubscriptionId, setSelectedSubscriptionId] =
    useState<string | null>(null);

  const fetchMember = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/members/${id}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) {
        setMember(null);
        return;
      }

      setMember(data.member);

      setActiveSubscriptions(
        data.activeSubscriptions || []
      );
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMember();
    }
  }, [id]);

  /*
   * ============================================================
   * TRANSFER RELATIONSHIPS
   * ============================================================
   *
   * IMPORTANT:
   *
   * A transfer DOES NOT create a new subscription.
   *
   * The existing subscription is moved:
   *
   *      Member A
   *          |
   *          | subscriptionId
   *          v
   *      Subscription
   *          |
   *          | memberId changed
   *          v
   *      Member B
   *
   * MembershipTransfer is the historical bridge:
   *
   *      subscriptionId
   *      fromMemberId
   *      toMemberId
   *
   * ============================================================
   */

  const outgoingTransfers =
    member?.outgoingMembershipTransfers || [];

  const incomingTransfers =
    member?.incomingMembershipTransfers || [];

  /*
   * ============================================================
   * INCOMING TRANSFER
   * ============================================================
   *
   * The receiving member already has the subscription inside
   * member.subscriptions because the subscription.memberId was
   * changed during transfer.
   *
   * Therefore:
   *
   *   transfer.subscriptionId === sub.id
   *
   * DO NOT use:
   *
   *   transfer.toSubscriptionId
   *
   * because there is no second subscription.
   */

  const getIncomingTransferForSubscription = (
    subscriptionId: string
  ) => {
    return (
      incomingTransfers.find(
        (transfer: any) =>
          transfer.subscriptionId === subscriptionId
      ) ?? null
    );
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="p-10 text-neutral-500">
        Loading...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-10 text-red-500">
        Member not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                router.push(
                  `/dashboard/members/${id}`
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-2xl font-bold">
                Memberships
              </h1>

              <p className="text-sm text-neutral-500">
                {member.name}
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================
            ACTIVE MEMBERSHIPS
            ============================================================ */}

        <div className="space-y-6">
          {activeSubscriptions.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-400">
              No active memberships found
            </div>
          ) : (
            activeSubscriptions.map((sub: any) => {
              const today = new Date();

              const startDate =
                new Date(sub.startDate);

              const endDate =
                new Date(sub.endDate);

              const isSessionBased =
                sub.usageType === "SESSION_BASED";

              const totalSessions =
                typeof sub.totalSessions === "number"
                  ? sub.totalSessions
                  : 0;

              const remainingSessions =
                typeof sub.remainingSessions === "number"
                  ? Math.max(
                      sub.remainingSessions,
                      0
                    )
                  : 0;

              const usedSessions =
                isSessionBased
                  ? Math.max(
                      totalSessions -
                        remainingSessions,
                      0
                    )
                  : 0;

              const sessionUsagePercentage =
                isSessionBased &&
                totalSessions > 0
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        Math.round(
                          (usedSessions /
                            totalSessions) *
                            100
                        )
                      )
                    )
                  : 0;

              const hasNoSessionsRemaining =
                isSessionBased &&
                remainingSessions <= 0;

              const daysLeft =
                calculateInclusiveDaysLeft(
                  endDate
                );

              const totalDays = Math.max(
                1,
                getCalendarDayNumber(
                  endDate
                ) -
                  getCalendarDayNumber(
                    startDate
                  ) +
                  1
              );

              /*
               * ======================================================
               * INCOMING TRANSFER
               * ======================================================
               *
               * This member currently owns `sub`.
               *
               * If this subscription came from another member,
               * MembershipTransfer.subscriptionId will equal sub.id.
               */

              const incomingTransfer =
                getIncomingTransferForSubscription(
                  sub.id
                );

              const receivedThroughTransfer =
                Boolean(incomingTransfer);

              return (
                <div
                  key={sub.id}
                  className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
                >
                  {/* TOP */}

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Dumbbell
                          size={18}
                          className="text-lime-400"
                        />

                        <h2 className="text-xl font-bold">
                          {sub.package?.name}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            sub.status === "ACTIVE"
                              ? "bg-lime-400/15 text-lime-400"
                              : sub.status === "FROZEN"
                              ? "bg-blue-400/15 text-blue-400"
                              : "bg-neutral-400/15 text-neutral-400"
                          }`}
                        >
                          {sub.status}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                            isSessionBased
                              ? hasNoSessionsRemaining
                                ? "border-red-500/30 bg-red-500/10 text-red-400"
                                : "border-violet-500/30 bg-violet-500/10 text-violet-300"
                              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          }`}
                        >
                          {isSessionBased ? (
                            <Dumbbell size={13} />
                          ) : (
                            <InfinityIcon size={13} />
                          )}

                          {isSessionBased
                            ? `${remainingSessions} Sessions Left`
                            : "Unlimited Access"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-neutral-400">
                        {sub.package?.service?.name}{" "}
                        • {sub.branch?.name}
                      </p>
                    </div>

                    {/* ACTIONS */}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          router.push(
                            `/dashboard/members/${member.id}/memberships/${sub.id}/edit`
                          );
                        }}
                        className="h-8 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 text-blue-400 transition-colors hover:bg-blue-500/20"
                      >
                        Edit Membership
                      </button>

                      {sub.status === "ACTIVE" && (
                        <button
                          onClick={() => {
                            setSelectedSubscriptionId(
                              sub.id
                            );

                            setOpenFreezeModal(true);
                          }}
                          className="h-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-amber-400 transition-colors hover:bg-amber-500/20"
                        >
                          Freeze
                        </button>
                      )}

                      {sub.status === "FROZEN" && (
                        <button
                          onClick={async () => {
                            const ok = confirm(
                              "Unfreeze this subscription?"
                            );

                            if (!ok) {
                              return;
                            }

                            await fetch(
                              `/api/subscriptions/${sub.id}/unfreeze`,
                              {
                                method: "PATCH",
                              }
                            );

                            fetchMember();
                          }}
                          className="h-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-emerald-400 transition-colors hover:bg-emerald-500/20"
                        >
                          Unfreeze
                        </button>
                      )}

                      <button
                        onClick={() => {
                          router.push(
                            `/dashboard/members/${member.id}/assignplan`
                          );
                        }}
                        className="h-8 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 font-medium text-violet-400 transition-colors hover:bg-violet-500/20"
                      >
                        Upgrade
                      </button>

                      <button
                        onClick={() => {
                          router.push(
                            `/dashboard/members/${member.id}/memberships/${sub.id}/billing`
                          );
                        }}
                        className="h-8 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
                      >
                        Billing History
                      </button>

                      {(sub.status === "ACTIVE" ||
                        sub.status === "FROZEN") && (
                        <button
                          type="button"
                          onClick={() => {
                            router.push(
                              `/dashboard/members/${member.id}/memberships/${sub.id}/transfer-billing`
                            );
                          }}
                          className="flex h-8 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                        >
                          <ArrowRightLeft
                            size={15}
                          />

                          Transfer Membership
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ====================================================
                      INCOMING TRANSFER
                      ==================================================== */}

                  {receivedThroughTransfer && (
                    <TransferDetails
                      transfer={incomingTransfer}
                      type="incoming"
                    />
                  )}

                  {/* MEMBERSHIP ACCESS */}

                  <div
                    className={`mt-6 rounded-2xl border p-5 ${
                      isSessionBased
                        ? hasNoSessionsRemaining
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-violet-500/30 bg-violet-500/5"
                        : "border-cyan-500/30 bg-cyan-500/5"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isSessionBased
                              ? "bg-violet-500/10 text-violet-300"
                              : "bg-cyan-500/10 text-cyan-300"
                          }`}
                        >
                          {isSessionBased ? (
                            <Dumbbell size={20} />
                          ) : (
                            <InfinityIcon size={20} />
                          )}
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                            Membership Usage Type
                          </p>

                          <h3 className="mt-1 font-semibold text-white">
                            {isSessionBased
                              ? "Fixed Session Membership"
                              : "Duration-Based Membership"}
                          </h3>

                          <p className="mt-1 text-sm text-neutral-400">
                            {isSessionBased
                              ? "One session is deducted after each successful QR check-in."
                              : "Member has unlimited access until the membership end date."}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${
                          isSessionBased
                            ? hasNoSessionsRemaining
                              ? "bg-red-500/10 text-red-400"
                              : "bg-violet-500/10 text-violet-300"
                            : "bg-cyan-500/10 text-cyan-300"
                        }`}
                      >
                        {isSessionBased
                          ? `${remainingSessions} of ${totalSessions} available`
                          : "Unlimited Entry"}
                      </span>
                    </div>

                    {isSessionBased && (
                      <div className="mt-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                            <p className="text-xs text-neutral-500">
                              Total Sessions
                            </p>

                            <p className="mt-2 text-xl font-bold text-white">
                              {totalSessions}
                            </p>
                          </div>

                          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                            <p className="text-xs text-neutral-500">
                              Sessions Used
                            </p>

                            <p className="mt-2 text-xl font-bold text-white">
                              {usedSessions}
                            </p>
                          </div>

                          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                            <p className="text-xs text-neutral-500">
                              Sessions Remaining
                            </p>

                            <p
                              className={`mt-2 text-xl font-bold ${
                                hasNoSessionsRemaining
                                  ? "text-red-400"
                                  : "text-violet-300"
                              }`}
                            >
                              {remainingSessions}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-neutral-500">
                              Session Usage
                            </span>

                            <span className="font-medium text-neutral-300">
                              {usedSessions} /{" "}
                              {totalSessions} used
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-black/40">
                            <div
                              className={`h-full rounded-full transition-all ${
                                hasNoSessionsRemaining
                                  ? "bg-red-400"
                                  : "bg-violet-400"
                              }`}
                              style={{
                                width: `${sessionUsagePercentage}%`,
                              }}
                            />
                          </div>
                        </div>

                        {hasNoSessionsRemaining && (
                          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                            <AlertCircle
                              size={18}
                              className="mt-0.5 shrink-0 text-red-400"
                            />

                            <div>
                              <p className="text-sm font-semibold text-red-400">
                                Session balance
                                exhausted
                              </p>

                              <p className="mt-1 text-xs text-red-300/70">
                                The member cannot use
                                another QR entry until
                                the membership is
                                renewed or another
                                session package is
                                purchased.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DETAILS */}

                  <div className="mt-6 grid max-w-md gap-2 md:grid-cols-3">
                    <div className="w-fit rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                      <p className="text-xs text-neutral-500">
                        Start Date
                      </p>

                      <p className="mt-2">
                        {formatDate(sub.startDate)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                      <p className="text-xs text-neutral-500">
                        End Date
                      </p>

                      <p className="mt-2">
                        {formatDate(sub.endDate)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                      <p className="text-xs text-neutral-500">
                        {sub.status === "FROZEN"
                          ? "Frozen"
                          : today < startDate
                          ? "Starts In"
                          : "Remaining"}
                      </p>

                      <p className="mt-2 font-semibold text-lime-400">
                        {sub.status === "FROZEN"
                          ? "FROZEN"
                          : `${daysLeft} / ${totalDays} Days`}
                      </p>
                    </div>
                  </div>

                  {/* FREEZE INFO */}

                  {sub.status === "FROZEN" && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-blue-800/40 bg-blue-950/20 p-4">
                        <p className="text-xs text-blue-400">
                          Freeze Start
                        </p>

                        <p className="mt-2">
                          {formatDate(
                            sub.freezeStart
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-blue-800/40 bg-blue-950/20 p-4">
                        <p className="text-xs text-blue-400">
                          Freeze End
                        </p>

                        <p className="mt-2">
                          {formatDate(
                            sub.freezeEnd
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ============================================================
            TRANSFERRED MEMBERSHIPS
            ============================================================

            IMPORTANT:

            Do NOT look inside member.subscriptions.

            Once the transfer happens:

                subscription.memberId = receivingMember.id

            Therefore the original member no longer owns that
            subscription.

            The original member's transferred memberships are
            represented by:

                member.outgoingMembershipTransfers

            And each transfer contains:

                transfer.subscription

            which is the SAME subscription that was moved.
            ============================================================ */}

        {outgoingTransfers.length > 0 && (
          <div className="mt-10 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Transferred Memberships
              </h2>

              <p className="text-sm text-neutral-500">
                Memberships that were transferred from
                this member.
              </p>
            </div>

            {outgoingTransfers.map(
              (transfer: any) => {
                /*
                 * THIS IS THE ACTUAL SUBSCRIPTION.
                 *
                 * It is no longer inside:
                 *
                 * member.subscriptions
                 *
                 * because its memberId was changed to
                 * the receiving member.
                 */

                const sub =
                  transfer.subscription;

                const receivingMember =
                  transfer.toMember;

                if (!sub) {
                  return (
                    <div
                      key={transfer.id}
                      className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6"
                    >
                      <p className="text-sm text-red-400">
                        Transfer record found, but the
                        associated subscription could
                        not be loaded.
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        Subscription ID:{" "}
                        {transfer.subscriptionId}
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={transfer.id}
                    className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <Dumbbell
                            size={18}
                            className="text-neutral-500"
                          />

                          <h2 className="text-xl font-bold text-neutral-300">
                            {sub.package?.name}
                          </h2>

                          <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs text-orange-400">
                            TRANSFERRED
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-neutral-500">
                          {sub.package?.service?.name}{" "}
                          • {sub.branch?.name}
                        </p>
                      </div>

                      {receivingMember && (
                        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3">
                          <p className="text-xs text-violet-400">
                            Transferred to
                          </p>

                          <p className="mt-1 font-semibold text-white">
                            {receivingMember.name}
                          </p>

                          <p className="mt-1 text-xs text-neutral-500">
                            {receivingMember.phone}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                        <p className="text-xs text-neutral-500">
                          Original Start Date
                        </p>

                        <p className="mt-2 text-sm text-white">
                          {formatDate(
                            sub.startDate
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                        <p className="text-xs text-neutral-500">
                          Original End Date
                        </p>

                        <p className="mt-2 text-sm text-white">
                          {formatDate(
                            sub.endDate
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
                        <p className="text-xs text-neutral-500">
                          Remaining At Transfer
                        </p>

                        <p className="mt-2 text-sm font-semibold text-white">
                          {transfer.remainingDays !=
                          null
                            ? `${transfer.remainingDays} days`
                            : "Not recorded"}
                        </p>
                      </div>
                    </div>

                    {/* ==================================================
                        ACTUAL SUBSCRIPTION REFERENCE
                        ==================================================

                        There is NO new subscription.

                        transfer.subscription is the same
                        subscription that was moved from this
                        member to the receiving member.
                        ================================================== */}

                    <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                      <p className="text-xs text-violet-400">
                        Transferred Membership
                      </p>

                      <div className="mt-2 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-neutral-500">
                            Subscription ID
                          </p>

                          <p className="mt-1 break-all text-sm text-white">
                            {sub.id}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-neutral-500">
                            Current Status
                          </p>

                          <p className="mt-1 text-sm font-semibold text-lime-400">
                            {sub.status}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-neutral-500">
                            Current Member
                          </p>

                          <p className="mt-1 text-sm text-white">
                            {receivingMember?.name ||
                              "Unknown"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* TRANSFER DETAILS */}

                    <TransferDetails
                      transfer={transfer}
                      type="outgoing"
                    />

                    <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                      <p className="text-sm font-medium text-orange-400">
                        This membership is no longer
                        active for this member.
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        The membership was transferred
                        to another member and cannot be
                        used by this member.
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* FREEZE MODAL */}

        {openFreezeModal &&
          selectedSubscriptionId && (
            <FreezeModal
              subscriptionId={
                selectedSubscriptionId
              }
              open={openFreezeModal}
              onClose={() => {
                setOpenFreezeModal(false);
                setSelectedSubscriptionId(null);
              }}
              onSuccess={() => {
                fetchMember();

                setOpenFreezeModal(false);
                setSelectedSubscriptionId(null);
              }}
            />
          )}
      </div>
    </div>
  );
}