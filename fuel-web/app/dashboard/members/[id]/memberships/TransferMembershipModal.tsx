"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type MemberSearchResult = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

type MembershipTransferQuote = {
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

type Props = {
  open: boolean;
  subscriptionId: string;
  currentMemberId: string;
  currentMemberName: string;
  packageName?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function TransferMembershipModal({
  open,
  subscriptionId,
  currentMemberId,
  currentMemberName,
  packageName,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<"SEARCH" | "CONFIRM">(
    "SEARCH"
  );

  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<
    MemberSearchResult[]
  >([]);

  const [selectedMember, setSelectedMember] =
    useState<MemberSearchResult | null>(null);

  const [reason, setReason] = useState("");
  const [transferQuote, setTransferQuote] =
  useState<MembershipTransferQuote | null>(null);

const [loadingTransferQuote, setLoadingTransferQuote] =
  useState(false);

const [transferQuoteError, setTransferQuoteError] =
  useState("");

  const [searching, setSearching] = useState(false);
  const [transferring, setTransferring] =
    useState(false);

  const [searchError, setSearchError] = useState("");
  const [transferError, setTransferError] =
    useState("");


    const fetchTransferQuote = async () => {
      try {
        setLoadingTransferQuote(true);
        setTransferQuoteError("");
        setTransferQuote(null);
    
        const response = await fetch(
          `/api/subscriptions/${subscriptionId}/transfer-quote`,
          {
            cache: "no-store",
          }
        );
    
        const data = await response.json();
    
        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to calculate the transfer fee."
          );
        }
    
        setTransferQuote(data.quote);
      } catch (error) {
        setTransferQuote(null);
    
        setTransferQuoteError(
          error instanceof Error
            ? error.message
            : "Unable to calculate the transfer fee."
        );
      } finally {
        setLoadingTransferQuote(false);
      }
    };

  const resetModal = () => {
    setStep("SEARCH");
    setQuery("");
    setMembers([]);
    setSelectedMember(null);
    setReason("");
    setTransferQuote(null);
setTransferQuoteError("");
setLoadingTransferQuote(false);
    setSearchError("");
    setTransferError("");
    setSearching(false);
    setTransferring(false);
  };

  const handleClose = () => {
    if (transferring) return;

    resetModal();
    onClose();
  };

  useEffect(() => {
    if (!open) {
      resetModal();
    }
  }, [open]);

  useEffect(() => {
    if (!open || step !== "SEARCH") return;

    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setMembers([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError("");

        const params = new URLSearchParams({
          q: normalizedQuery,
          excludeMemberId: currentMemberId,
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
            data.message || "Unable to search members."
          );
        }

        setMembers(data.members || []);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setMembers([]);
        setSearchError(
          error instanceof Error
            ? error.message
            : "Unable to search members."
        );
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, open, step, currentMemberId]);
  const selectMember = (
    member: MemberSearchResult
  ) => {
    setSelectedMember(member);
    setTransferError("");
    setTransferQuoteError("");
    setStep("CONFIRM");
  
    void fetchTransferQuote();
  };

  const confirmTransfer = async () => {
    if (!selectedMember) return;

    const normalizedReason = reason.trim();
    
    if (!normalizedReason) {
      setTransferError(
        "Please enter the reason for the transfer."
      );
      return;
    }
    
    if (!transferQuote) {
      setTransferError(
        "The transfer fee has not been calculated."
      );
      return;
    }


    try {
      setTransferring(true);
      setTransferError("");

      const response = await fetch(
        `/api/subscriptions/${subscriptionId}/transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            toMemberId: selectedMember.id,
            reason: normalizedReason,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to transfer the membership."
        );
      }

      resetModal();
      onSuccess();
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? error.message
          : "Unable to transfer the membership."
      );
    } finally {
      setTransferring(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
    <div className="flex min-h-full items-start justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close transfer modal"
        onClick={handleClose}
        className="fixed inset-0 cursor-default"
      />

      <div className="relative z-10 flex max-h-[calc(100dvh-24px)] w-full max-w-xl flex-col overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:rounded-3xl">
        {step === "SEARCH" ? (
          <>
            <div className="flex items-center justify-between border-b border-neutral-800 p-6">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Transfer Membership
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Transfer {packageName || "this membership"}{" "}
                  from {currentMemberName}
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Search receiving member
              </label>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  autoFocus
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search by name, phone, or email"
                  className="h-12 w-full rounded-xl border border-neutral-800 bg-black pl-11 pr-11 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-lime-400"
                />

                {searching && (
                  <Loader2
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-lime-400"
                  />
                )}
              </div>

              <p className="mt-2 text-xs text-neutral-600">
                Enter at least two characters.
              </p>

              {searchError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {searchError}
                </div>
              )}

              <div className="mt-5 max-h-[360px] space-y-2 overflow-y-auto">
                {!searching &&
                  query.trim().length >= 2 &&
                  members.length === 0 &&
                  !searchError && (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center">
                      <UserRound
                        size={24}
                        className="mx-auto text-neutral-600"
                      />

                      <p className="mt-3 text-sm text-neutral-400">
                        No members found.
                      </p>
                    </div>
                  )}

                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => selectMember(member)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-left transition-colors hover:border-lime-400/40 hover:bg-neutral-800"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-lime-400">
                      <UserRound size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">
                        {member.name}
                      </p>

                      <p className="mt-1 text-sm text-neutral-400">
                        {member.phone}
                      </p>

                      {member.email && (
                        <p className="mt-0.5 truncate text-xs text-neutral-600">
                          {member.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 border-b border-neutral-800 p-6">
              <button
                type="button"
                disabled={transferring}
                onClick={() => {
                  setStep("SEARCH");
                  setTransferError("");
                  setTransferQuoteError("");
                  setTransferQuote(null);
                  setSelectedMember(null);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white disabled:opacity-50"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <h2 className="text-xl font-bold text-white">
                  Confirm Transfer
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Review the transfer information carefully.
                </p>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">
                    Transfer from
                  </p>
                  <p className="mt-1 truncate font-semibold text-white">
                    {currentMemberName}
                  </p>
                </div>

                <div className="text-neutral-600">→</div>

                <div className="min-w-0 text-right">
                  <p className="text-xs text-neutral-500">
                    Transfer to
                  </p>
                  <p className="mt-1 truncate font-semibold text-lime-400">
                    {selectedMember?.name}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {selectedMember?.phone}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Transfer reason
                </label>

                <textarea
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="Enter the reason for transferring this membership"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-neutral-800 bg-black p-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-lime-400"
                />
              </div>
              <div>
  <label className="mb-2 block text-sm font-medium text-neutral-300">
    Transfer fee
  </label>

  {loadingTransferQuote ? (
    <div className="flex min-h-32 items-center justify-center rounded-2xl border border-neutral-800 bg-black">
      <Loader2
        size={20}
        className="animate-spin text-lime-400"
      />

      <span className="ml-3 text-sm text-neutral-400">
        Calculating transfer fee...
      </span>
    </div>
  ) : transferQuoteError ? (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
      <p className="text-sm leading-6 text-red-400">
        {transferQuoteError}
      </p>

      <button
        type="button"
        onClick={() => {
          void fetchTransferQuote();
        }}
        className="mt-3 text-sm font-semibold text-red-300 underline underline-offset-4"
      >
        Try again
      </button>
    </div>
  ) : transferQuote ? (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-black">
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-neutral-500">
            Remaining membership
          </span>

          <span className="font-medium text-white">
            {transferQuote.remainingDays} days
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-neutral-500">
            Applied slab
          </span>

          <span className="text-right font-medium text-white">
            {transferQuote.slab.label}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-neutral-500">
            Base transfer fee
          </span>

          <span className="font-medium text-white">
            ₹
            {transferQuote.baseTransferFee.toLocaleString(
              "en-IN"
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-neutral-500">
            CGST ({transferQuote.cgstPercentage}%)
          </span>

          <span className="text-white">
            ₹
            {transferQuote.cgstAmount.toLocaleString(
              "en-IN",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-neutral-500">
            SGST ({transferQuote.sgstPercentage}%)
          </span>

          <span className="text-white">
            ₹
            {transferQuote.sgstAmount.toLocaleString(
              "en-IN",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900 px-4 py-4">
        <span className="font-medium text-neutral-300">
          Total transfer fee
        </span>

        <span className="text-xl font-bold text-lime-400">
          ₹
          {transferQuote.transferFee.toLocaleString(
            "en-IN"
          )}
        </span>
      </div>
    </div>
  ) : null}

  <p className="mt-2 text-xs leading-5 text-neutral-600">
    The fee is automatically selected from the central
    settings based on the remaining membership duration.
  </p>
</div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-400"
                  />

<p className="text-sm leading-6 text-amber-100">
  This action will transfer the membership, original
  invoice, and all associated payment records from the
  current member to the selected member. A transfer fee
  of{" "}
  <strong>
    {transferQuote
      ? `₹${transferQuote.transferFee.toLocaleString(
          "en-IN"
        )}`
      : "the configured amount"}
  </strong>{" "}
  will be recorded against this transfer. This action
  cannot be automatically reversed.
</p>
                </div>
              </div>

              {transferError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {transferError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={transferring}
                  onClick={handleClose}
                  className="h-11 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-4 font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
  type="button"
  disabled={
    transferring ||
    loadingTransferQuote ||
    !transferQuote ||
    !reason.trim()
  }
  onClick={confirmTransfer}
  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
>
                  {transferring && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {transferring
                    ? "Transferring..."
                    : "Confirm Transfer"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}