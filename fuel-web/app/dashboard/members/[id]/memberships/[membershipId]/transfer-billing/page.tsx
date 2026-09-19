"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  ReceiptText,
  Search,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";

type PaymentMode = "CASH" | "UPI" | "CARD" | "RAZORPAY";

type TransferQuote = {
  remainingDays: number;
  slab: {
    id: string;
    label: string;
    minDays: number;
    maxDays: number;
  };
  baseTransferFee: number;
  cgstPercentage: number;
  sgstPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  transferFee: number;
};

type Member = {
  id: string;
  name: string;
  phone?: string;
  email?: string | null;
};

type Subscription = {
  id: string;
  status: string;
  package?: {
    name: string;
  };
  service?: {
    name: string;
  };
};

function formatCurrency(value: number | string | undefined | null) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function TransferBillingPage() {
  const params = useParams();
  const router = useRouter();

  const memberId = String(params.id);
  const subscriptionId = String(params.membershipId);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [member, setMember] = useState<Member | null>(null);
  const [subscription, setSubscription] =
    useState<Subscription | null>(null);
  const [quote, setQuote] = useState<TransferQuote | null>(null);

  // Target member
  const [targetQuery, setTargetQuery] = useState("");
  const [targetMembers, setTargetMembers] = useState<Member[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [toMember, setToMember] = useState<Member | null>(null);

  // Transfer
  const [reason, setReason] = useState("");

  // Billing
  const [paymentMode, setPaymentMode] = useState<PaymentMode | "">("");
  const [note, setNote] = useState("");
  const [amountCollected, setAmountCollected] = useState("");

  /**
   * Load source member, subscription and transfer quote.
   */
  useEffect(() => {
    if (!memberId || !subscriptionId) {
      setError("Invalid transfer request.");
      setLoading(false);
      return;
    }

    const fetchTransferDetails = async () => {
      try {
        setLoading(true);
        setError("");

        // Source member
        const memberRes = await fetch(`/api/members/${memberId}`, {
          cache: "no-store",
        });

        if (!memberRes.ok) {
          throw new Error("Failed to load current member.");
        }

        const memberData = await memberRes.json();

        setMember(memberData.member);

        // Find subscription
        const currentSubscription = (
          memberData.activeSubscriptions || []
        ).find(
          (sub: Subscription) => sub.id === subscriptionId
        );

        if (!currentSubscription) {
          throw new Error("Membership not found.");
        }

        setSubscription(currentSubscription);

        // Transfer quote
        const quoteRes = await fetch(
          `/api/subscriptions/${subscriptionId}/transfer-quote`,
          {
            cache: "no-store",
          }
        );

        const quoteData = await quoteRes.json().catch(() => null);

        if (!quoteRes.ok) {
          throw new Error(
            quoteData?.error ||
              "Unable to calculate transfer fee."
          );
        }

        const transferQuote: TransferQuote =
          quoteData.quote || quoteData;

        setQuote(transferQuote);

        // Prefill complete amount
        setAmountCollected(
          String(transferQuote.transferFee)
        );
      } catch (err: any) {
        console.error(err);

        setError(
          err?.message ||
            "Something went wrong while loading transfer billing."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTransferDetails();
  }, [memberId, subscriptionId]);

  /**
   * Search members.
   */
  useEffect(() => {
    const normalizedQuery = targetQuery.trim();

    if (toMember || normalizedQuery.length < 2) {
      setTargetMembers([]);
      setSearchingMembers(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setSearchingMembers(true);
        setSearchError("");

        const params = new URLSearchParams({
          q: normalizedQuery,
          excludeMemberId: memberId,
        });

        const response = await fetch(
          `/api/members/search?${params.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || "Unable to search members."
          );
        }

        setTargetMembers(data.members || []);
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error(err);

        setTargetMembers([]);

        setSearchError(
          err instanceof Error
            ? err.message
            : "Unable to search members."
        );
      } finally {
        if (!controller.signal.aborted) {
          setSearchingMembers(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [targetQuery, memberId, toMember]);

  const collectedAmount = Number(amountCollected) || 0;

  const balanceAmount = useMemo(() => {
    if (!quote) {
      return 0;
    }

    return Math.max(
      Number(quote.transferFee) - collectedAmount,
      0
    );
  }, [quote, collectedAmount]);

  const isFullyPaid =
    !!quote &&
    collectedAmount >= Number(quote.transferFee);

  const canSubmit =
    !!quote &&
    !!toMember &&
    !!reason.trim() &&
    !!paymentMode &&
    isFullyPaid &&
    !submitting &&
    !success;

  const selectTargetMember = (selected: Member) => {
    setToMember(selected);
    setTargetQuery("");
    setTargetMembers([]);
    setSearchError("");
    setError("");
  };

  const clearTargetMember = () => {
    setToMember(null);
    setTargetQuery("");
    setTargetMembers([]);
    setError("");
  };

  const handlePayAndTransfer = async () => {
    if (!quote) {
      setError("Transfer fee could not be calculated.");
      return;
    }

    if (!toMember) {
      setError("Please select the member to transfer to.");
      return;
    }

    if (!reason.trim()) {
      setError("Transfer reason is required.");
      return;
    }

    if (!paymentMode) {
      setError("Please select a payment method.");
      return;
    }

    if (collectedAmount < Number(quote.transferFee)) {
      setError(
        "The complete transfer fee must be paid before transfer."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const res = await fetch(
        `/api/subscriptions/${subscriptionId}/transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            toMemberId: toMember.id,
            reason: reason.trim(),
            paymentMode,
            paidAmount: collectedAmount,
            notes: note.trim() || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Payment failed."
        );
      }

      setSuccess(
        "Payment successful. Membership transferred successfully."
      );

      setTimeout(() => {
        router.push(
          `/dashboard/members/${memberId}/memberships`
        );
      }, 1200);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to complete payment and membership transfer."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-500">
          <Loader2
            size={20}
            className="animate-spin"
          />
          Loading transfer billing...
        </div>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="p-6 md:p-10">
        <button
          type="button"
          onClick={() =>
            router.push(
              `/dashboard/members/${memberId}/memberships`
            )
          }
          className="mb-6 flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Memberships
        </button>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          <div className="flex items-center gap-3">
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!member || !subscription || !quote) {
    return (
      <div className="p-10 text-neutral-400">
        Transfer billing information is unavailable.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-6 text-white md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <button
          type="button"
          disabled={submitting}
          onClick={() =>
            router.push(
              `/dashboard/members/${memberId}/memberships`
            )
          }
          className="mb-6 flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Back to Memberships
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
              <ReceiptText size={20} />
            </div>

            <div>
              <h1 className="text-2xl font-semibold">
                Transfer Membership
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                Select the new member and collect the
                transfer fee to complete the transfer.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <XCircle size={18} />
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">

          {/* LEFT */}
          <div className="space-y-6">

            {/* Transfer Details */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
              <div className="mb-5 flex items-center gap-2">
                <ArrowLeft
                  size={17}
                  className="text-neutral-500"
                />

                <h2 className="font-semibold">
                  Transfer Details
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">

                {/* From */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
                    From Member
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
                      <UserRound
                        size={18}
                        className="text-neutral-400"
                      />
                    </div>

                    <div>
                      <p className="font-medium">
                        {member.name}
                      </p>

                      {member.phone && (
                        <p className="text-xs text-neutral-500">
                          {member.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* To */}
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
                    To Member
                  </p>

                  {toMember ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10">
                          <UserRound
                            size={18}
                            className="text-rose-400"
                          />
                        </div>

                        <div>
                          <p className="font-medium">
                            {toMember.name}
                          </p>

                          {toMember.phone && (
                            <p className="text-xs text-neutral-500">
                              {toMember.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={clearTargetMember}
                        className="text-xs text-neutral-500 hover:text-white"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
                        />

                        <input
                          type="text"
                          value={targetQuery}
                          disabled={submitting}
                          onChange={(e) =>
                            setTargetQuery(e.target.value)
                          }
                          placeholder="Search name, phone, or email"
                          className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-9 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-rose-400"
                        />

                        {searchingMembers && (
                          <Loader2
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-neutral-500"
                          />
                        )}
                      </div>

                      {targetMembers.length > 0 && (
                        <div className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
                          {targetMembers.map((target) => (
                            <button
                              key={target.id}
                              type="button"
                              onClick={() =>
                                selectTargetMember(target)
                              }
                              className="flex w-full items-center gap-3 border-b border-neutral-800 px-4 py-3 text-left transition last:border-b-0 hover:bg-neutral-800"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800">
                                <UserRound
                                  size={16}
                                  className="text-neutral-400"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">
                                  {target.name}
                                </p>

                                <p className="truncate text-xs text-neutral-500">
                                  {target.phone ||
                                    target.email ||
                                    target.id}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchError && (
                        <p className="mt-2 text-xs text-red-400">
                          {searchError}
                        </p>
                      )}

                      {!searchingMembers &&
                        targetQuery.trim().length >= 2 &&
                        targetMembers.length === 0 &&
                        !searchError && (
                          <p className="mt-2 text-xs text-neutral-600">
                            No members found.
                          </p>
                        )}
                    </div>
                  )}
                </div>
              </div>

              {/* Membership information */}
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-neutral-500">
                    Membership
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {subscription.package?.name ||
                      subscription.service?.name ||
                      "Membership"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-500">
                    Remaining Days
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {quote.remainingDays} days
                  </p>
                </div>

                <div>
                  <p className="text-xs text-neutral-500">
                    Fee Slab
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {quote.slab.label}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Transfer Reason
                  <span className="ml-1 text-red-400">
                    *
                  </span>
                </label>

                <textarea
                  value={reason}
                  disabled={submitting}
                  onChange={(e) =>
                    setReason(e.target.value)
                  }
                  rows={3}
                  placeholder="Enter the reason for transferring this membership..."
                  className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-400"
                />
              </div>
            </section>

            {/* Billing */}
            <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
              <div className="mb-6 flex items-center gap-2">
                <ReceiptText
                  size={18}
                  className="text-neutral-500"
                />

                <h2 className="font-semibold">
                  Billing
                </h2>
              </div>

              {/* Transfer Fee */}
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Transfer Fee
                  <span className="ml-1 text-red-400">
                    *
                  </span>
                </label>

                <div className="flex h-11 items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4">
                  <span className="text-sm text-neutral-500">
                    Transfer fee
                  </span>

                  <span className="font-semibold text-white">
                    {formatCurrency(quote.transferFee)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-neutral-500">
                  This amount is calculated from the
                  membership transfer slab and cannot be
                  edited.
                </p>
              </div>

              {/* Payment Method */}
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Payment Method
                  <span className="ml-1 text-red-400">
                    *
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    {
                      value: "CASH" as PaymentMode,
                      label: "Cash",
                      icon: Wallet,
                    },
                    {
                      value: "UPI" as PaymentMode,
                      label: "UPI",
                      icon: CreditCard,
                    },
                    {
                      value: "CARD" as PaymentMode,
                      label: "Card",
                      icon: CreditCard,
                    },
                    {
                      value: "RAZORPAY" as PaymentMode,
                      label: "Razorpay",
                      icon: CreditCard,
                    },
                  ].map((method) => {
                    const Icon = method.icon;
                    const selected =
                      paymentMode === method.value;

                    return (
                      <button
                        key={method.value}
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          setPaymentMode(method.value)
                        }
                        className={[
                          "flex h-20 flex-col items-center justify-center gap-2 rounded-xl border text-sm transition",
                          selected
                            ? "border-lime-400 bg-lime-400/10 text-lime-300"
                            : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-white",
                        ].join(" ")}
                      >
                        <Icon size={18} />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Collected */}
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Amount Collected
                  <span className="ml-1 text-red-400">
                    *
                  </span>
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={submitting}
                    value={amountCollected}
                    onChange={(e) =>
                      setAmountCollected(
                        e.target.value
                      )
                    }
                    className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-9 pr-4 text-sm text-white outline-none transition focus:border-lime-400"
                  />
                </div>

                {balanceAmount > 0 && (
                  <p className="mt-2 text-xs text-red-400">
                    Balance:{" "}
                    {formatCurrency(balanceAmount)}
                  </p>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Note
                </label>

                <textarea
                  value={note}
                  disabled={submitting}
                  onChange={(e) =>
                    setNote(e.target.value)
                  }
                  rows={4}
                  placeholder="Add a note about this transfer payment..."
                  className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-400"
                />
              </div>
            </section>

            {/* Warning */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 text-amber-400">
                  <XCircle size={18} />
                </div>

                <div>
                  <p className="text-sm font-medium text-amber-300">
                    Transfer will be completed after
                    payment
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-400/70">
                    The membership will not be transferred
                    until the complete transfer fee has
                    been successfully paid. Payment and
                    transfer are processed together.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">

              <div className="border-b border-neutral-800 px-5 py-4">
                <div className="flex items-center gap-2">
                  <ReceiptText
                    size={18}
                    className="text-neutral-400"
                  />

                  <h2 className="font-semibold">
                    Billing Summary
                  </h2>
                </div>
              </div>

              <div className="space-y-4 p-5">

                {/* Base Fee */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-neutral-400">
                      Transfer Fee
                    </p>

                    <p className="mt-1 text-xs text-neutral-600">
                      {quote.slab.label}
                    </p>
                  </div>

                  <p className="text-sm font-medium">
                    {formatCurrency(
                      quote.baseTransferFee
                    )}
                  </p>
                </div>

                {/* CGST */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">
                    CGST ({quote.cgstPercentage}%)
                  </span>

                  <span>
                    {formatCurrency(
                      quote.cgstAmount
                    )}
                  </span>
                </div>

                {/* SGST */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">
                    SGST ({quote.sgstPercentage}%)
                  </span>

                  <span>
                    {formatCurrency(
                      quote.sgstAmount
                    )}
                  </span>
                </div>

                {/* Total */}
                <div className="border-t border-neutral-800 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-300">
                      Total
                    </span>

                    <span className="text-xl font-semibold text-white">
                      {formatCurrency(
                        quote.transferFee
                      )}
                    </span>
                  </div>
                </div>

                {/* Collected / Balance */}
                <div className="rounded-xl bg-neutral-900 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">
                      Amount Collected
                    </span>

                    <span className="font-medium text-green-400">
                      {formatCurrency(
                        collectedAmount
                      )}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-neutral-500">
                      Balance
                    </span>

                    <span
                      className={
                        balanceAmount > 0
                          ? "font-medium text-red-400"
                          : "font-medium text-green-400"
                      }
                    >
                      {formatCurrency(
                        balanceAmount
                      )}
                    </span>
                  </div>
                </div>

                {/* Pay & Transfer */}
                <button
                  type="button"
                  onClick={handlePayAndTransfer}
                  disabled={!canSubmit}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Pay & Transfer
                    </>
                  )}
                </button>

                {/* Cancel */}
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    router.push(
                      `/dashboard/members/${memberId}/memberships`
                    )
                  }
                  className="h-11 w-full rounded-xl border border-neutral-800 text-sm font-medium text-neutral-400 transition hover:bg-neutral-900 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}