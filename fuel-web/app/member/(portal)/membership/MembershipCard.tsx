"use client";

import { useState } from "react";
import {
  Calendar,
  Building2,
  CreditCard,
  Receipt,
  Download,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Snowflake,
  Dumbbell,
  Infinity as InfinityIcon,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface MembershipCardProps {
  subscription: any;
}

const MembershipCard = ({
  subscription,
}: MembershipCardProps) => {
  const [paying, setPaying] = useState(false);

  const invoice = subscription.invoice;

  const isSessionBased =
    subscription.usageType ===
    "SESSION_BASED";

  const totalSessions =
    typeof subscription.totalSessions ===
      "number"
      ? subscription.totalSessions
      : 0;

  const remainingSessions =
    typeof subscription.remainingSessions ===
      "number"
      ? Math.max(
          subscription.remainingSessions,
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

  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const existing = document.getElementById("razorpay-sdk");

      if (existing) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async () => {
    try {
      setPaying(true);

      const loaded = await loadRazorpay();

      if (!loaded) {
        alert("Failed to load payment gateway");
        return;
      }

      const res = await fetch("/api/payment/collect-balance/razorpay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.balanceAmount,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      const razorpay = new window.Razorpay({
        key: data.key,
        amount: data.amount,
        currency: "INR",
        order_id: data.orderId,
        name: "Gym Membership",
        description: invoice.packageName,
        prefill: {
          name: data.member.name,
          email: data.member.email,
          contact: data.member.phone,
        },
        theme: {
          color: "#A3E635",
        },
      });

      razorpay.open();
    } catch (e) {
      console.log(e);
      alert("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const downloadInvoice = () => {
    window.open(`/api/invoice/${invoice.id}`, "_blank");
  };

  const downloadReceipt = (paymentId: string) => {
    window.open(`/api/receipt/${paymentId}`, "_blank");
  };

  // Calculate days remaining
  const daysRemaining = () => {
    const now = new Date();
    const end = new Date(subscription.endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur rounded-3xl border border-white/10 p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            {subscription.packageName}
          </h2>
          <div className="flex items-center gap-2 text-gray-400 mt-2">
            <Building2 size={16} />
            <span>{subscription.branchName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {subscription.status === "ACTIVE" ? (
            <span className="px-4 py-2 rounded-full bg-green-500/10 text-green-400 text-sm font-medium">
              Active
            </span>
          ) : subscription.status === "FROZEN" ? (
            <span className="px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium flex items-center gap-2">
              <Snowflake size={14} />
              Frozen
            </span>
          ) : subscription.status === "EXPIRED" ? (
            <span className="px-4 py-2 rounded-full bg-gray-500/10 text-gray-400 text-sm font-medium">
              Expired
            </span>
          ) : (
            <span className="px-4 py-2 rounded-full bg-red-500/10 text-red-400 text-sm font-medium">
              {subscription.status}
            </span>
          )}

          {daysRemaining() > 0 && daysRemaining() <= 7 && (
            <span className="px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-400 text-sm font-medium flex items-center gap-2">
              <Clock size={14} />
              {daysRemaining()} days left
            </span>
          )}
        </div>
      </div>

      {/* MEMBERSHIP ACCESS */}
      <div
        className={`rounded-2xl border p-5 ${
          isSessionBased
            ? hasNoSessionsRemaining
              ? "border-red-500/20 bg-red-500/5"
              : "border-violet-500/20 bg-violet-500/5"
            : "border-lime-500/20 bg-lime-500/5"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                isSessionBased
                  ? "bg-violet-500/10 text-violet-300"
                  : "bg-lime-500/10 text-lime-300"
              }`}
            >
              {isSessionBased ? (
                <Dumbbell size={21} />
              ) : (
                <InfinityIcon size={21} />
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                Membership Access
              </p>

              <h3 className="mt-1 font-semibold text-white">
                {isSessionBased
                  ? "Fixed Session Membership"
                  : "Unlimited Access Membership"}
              </h3>

              <p className="mt-1 text-xs text-gray-400">
                {isSessionBased
                  ? "One session is deducted after every successful QR check-in."
                  : "Unlimited entries are available until the membership expires."}
              </p>
            </div>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
              isSessionBased
                ? hasNoSessionsRemaining
                  ? "bg-red-500/10 text-red-400"
                  : "bg-violet-500/10 text-violet-300"
                : "bg-lime-500/10 text-lime-300"
            }`}
          >
            {isSessionBased
              ? `${remainingSessions} Sessions Left`
              : "Unlimited Entry"}
          </span>
        </div>

        {isSessionBased && (
          <div className="mt-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-black/20 p-4">
                <p className="text-xs text-gray-500">
                  Total Sessions
                </p>

                <p className="mt-1 text-xl font-bold text-white">
                  {totalSessions}
                </p>
              </div>

              <div className="rounded-xl bg-black/20 p-4">
                <p className="text-xs text-gray-500">
                  Sessions Used
                </p>

                <p className="mt-1 text-xl font-bold text-white">
                  {usedSessions}
                </p>
              </div>

              <div className="rounded-xl bg-black/20 p-4">
                <p className="text-xs text-gray-500">
                  Sessions Remaining
                </p>

                <p
                  className={`mt-1 text-xl font-bold ${
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
                <span className="text-gray-500">
                  Session usage
                </span>

                <span className="font-medium text-gray-300">
                  {usedSessions} of{" "}
                  {totalSessions} used
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-black/30">
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
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-red-400"
                />

                <div>
                  <p className="text-sm font-medium text-red-400">
                    No sessions remaining
                  </p>

                  <p className="mt-1 text-xs text-red-300/70">
                    Renew or purchase another session package to continue booking classes.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DATES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Calendar size={16} />
            Start Date
          </div>
          <p className="text-white">
            {new Date(subscription.startDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="bg-black/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Calendar size={16} />
            End Date
          </div>
          <p className="text-white">
            {new Date(subscription.endDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="bg-black/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Clock size={16} />
            Duration
          </div>
          <p className="text-white">
            {subscription.packageDurationInDays} Days
          </p>
        </div>
      </div>

      {/* Freeze Dates if Frozen */}
      {subscription.status === "FROZEN" && subscription.freezeStart && subscription.freezeEnd && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-950/20 rounded-2xl p-4 border border-blue-800/40">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Snowflake size={16} />
              Freeze Start
            </div>
            <p className="text-white">
              {new Date(subscription.freezeStart).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="bg-blue-950/20 rounded-2xl p-4 border border-blue-800/40">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Snowflake size={16} />
              Freeze End
            </div>
            <p className="text-white">
              {new Date(subscription.freezeEnd).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      )}

      {/* BILLING SECTION */}
      {invoice && (
        <>
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="text-lime-400" size={20} />
              <h3 className="text-lg font-semibold text-white">
                Billing Details
              </h3>
            </div>

            <div className="bg-black/20 rounded-2xl p-5">
              {/* Invoice Details */}
              <div className="space-y-3 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Invoice Number</span>
                  <span className="text-white font-mono text-sm">
                    {invoice.invoiceNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Package Amount</span>
                  <span className="text-white">
                    ₹{(invoice.packageAmount / 100).toLocaleString()}
                  </span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Discount Applied</span>
                    <span className="text-green-400">
                      -₹{(invoice.discountAmount / 100).toLocaleString()}
                    </span>
                  </div>
                )}
                {(invoice.cgstAmount > 0 || invoice.sgstAmount > 0) && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">
                        CGST ({invoice.cgstPercentage || 0}%)
                      </span>
                      <span className="text-white text-sm">
                        +₹{((invoice.cgstAmount || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">
                        SGST ({invoice.sgstPercentage || 0}%)
                      </span>
                      <span className="text-white text-sm">
                        +₹{((invoice.sgstAmount || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Totals */}
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Total Amount</span>
                  <span className="text-xl font-bold text-white">
                    ₹{((invoice.finalAmount + (invoice.totalTax || 0)) / 100).toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="text-green-400 font-medium">
                    ₹{(invoice.paidAmount / 100).toLocaleString()}
                  </span>
                </div>

                {invoice.balanceAmount > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <span className="text-red-400 font-medium">Balance Due</span>
                    <span className="text-xl font-bold text-red-400">
                      ₹{(invoice.balanceAmount / 100).toLocaleString()}
                    </span>
                  </div>
                )}

                {invoice.balanceAmount === 0 && (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <span className="text-green-400 font-medium flex items-center gap-2">
                      <CheckCircle2 size={18} />
                      Fully Paid
                    </span>
                    <span className="text-green-400 font-bold">
                      ₹0
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-wrap gap-3 mt-4">
              {invoice.balanceAmount > 0 && (
                <button
                  onClick={handlePayNow}
                  disabled={paying}
                  className="px-6 py-3 bg-red-500 text-white rounded-2xl font-semibold flex items-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wallet size={18} />
                      Pay ₹{(invoice.balanceAmount / 100).toLocaleString()} Now
                    </>
                  )}
                </button>
              )}

              <button
                onClick={downloadInvoice}
                className="px-6 py-3 bg-white/10 text-white rounded-2xl font-medium flex items-center gap-2 hover:bg-white/20 transition-colors"
              >
                <Download size={18} />
                Invoice
              </button>
            </div>
          </div>

          {/* PAYMENT HISTORY */}
          {invoice.payments?.length > 0 && (
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Receipt size={20} className="text-lime-400" />
                <h3 className="text-lg font-semibold text-white">
                  Payment History
                </h3>
              </div>

              <div className="space-y-3">
                {invoice.payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="bg-black/20 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center">
                        {payment.status === "PAID" ? (
                          <CheckCircle2 size={20} className="text-green-400" />
                        ) : (
                          <AlertCircle size={20} className="text-red-400" />
                        )}
                      </div>

                      <div>
                        <p className="text-white font-medium">
                          {payment.receiptNumber}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                          <span>₹{(payment.amount / 100).toLocaleString()}</span>
                          <span className="w-1 h-1 bg-gray-600 rounded-full" />
                          <span>{payment.paymentMode}</span>
                          <span className="w-1 h-1 bg-gray-600 rounded-full" />
                          <span>
                            {new Date(payment.paidAt || payment.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {payment.status === "PAID" && (
                      <button
                        onClick={() => downloadReceipt(payment.id)}
                        className="text-lime-400 hover:text-lime-300 text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <Download size={16} />
                        Receipt
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MembershipCard;