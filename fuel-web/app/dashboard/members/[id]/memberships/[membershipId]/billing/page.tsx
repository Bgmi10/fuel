"use client";

import { paiseToRupees } from "@/app/utils/helper";
import { Invoice, Payment, Subscription } from "@prisma/client";
import { ArrowLeft, Download } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CollectBalanceModal } from "../../../CollectBalanceModal";

type InvoiceWithPayments = Invoice & {
  payments: Payment[];
};

type SubscriptionType = Subscription & {
  invoice: InvoiceWithPayments | null;
};

/* ============================================================
 * MONEY HELPERS (all PAISE)
 *
 * Total payable = finalAmount + totalTax - discountAmount
 * (same as the original billing page's Final Amount).
 * Paid / balance come from PAID payment rows, not from the
 * stored paidAmount / balanceAmount columns.
 * ============================================================ */

const money = (paise: number) => `₹${paiseToRupees(paise || 0)}`;

const sumPaid = (payments: Payment[]) =>
  payments.reduce((t, p) => (p.status === "PAID" ? t + p.amount : t), 0);

const invoiceTax = (invoice: Invoice) => Math.round(invoice.totalTax ?? 0);

const invoiceTotal = (invoice: Invoice) =>
  Math.max(
    (invoice.finalAmount || 0) + invoiceTax(invoice) - (invoice.discountAmount || 0),
    0
  );

const invoiceBalance = (invoice: InvoiceWithPayments) =>
  Math.max(invoiceTotal(invoice) - sumPaid(invoice.payments), 0);

const statusClass = (status: string) =>
  status === "FULLY_PAID"
    ? "bg-lime-400/15 text-lime-400"
    : status === "PARTIAL_PAID"
    ? "bg-yellow-400/15 text-yellow-400"
    : status === "CANCELLED"
    ? "bg-neutral-700/30 text-neutral-400"
    : "bg-red-400/15 text-red-400";

export default function Page() {
  const { membershipId: id } = useParams();
  const router = useRouter();

  const [subscription, setSubscription] = useState<SubscriptionType | null>(null);
  const [upgradeInvoices, setUpgradeInvoices] = useState<InvoiceWithPayments[]>([]);
  const [collectTarget, setCollectTarget] = useState<InvoiceWithPayments | null>(null);
  const [error, setError] = useState("");

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Unable to load billing details.");
        return;
      }

      setError("");
      setSubscription(data.subscription);
      setUpgradeInvoices(data.upgradeInvoices ?? []);
    } catch (err) {
      console.log(err);
      setError("Unable to load billing details.");
    }
  }, [id]);

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  // Original first, then upgrades oldest to newest
  const invoices = useMemo(() => {
    const list: { label: string; invoice: InvoiceWithPayments }[] = [];

    if (subscription?.invoice) {
      list.push({ label: "Original Invoice", invoice: subscription.invoice });
    }

    upgradeInvoices.forEach((invoice, index) =>
      list.push({ label: `Upgrade Invoice #${index + 1}`, invoice })
    );

    return list;
  }, [subscription, upgradeInvoices]);

  const totals = useMemo(() => {
    const billed = invoices.reduce((t, { invoice }) => t + invoiceTotal(invoice), 0);
    const paid = invoices.reduce((t, { invoice }) => t + sumPaid(invoice.payments), 0);

    return { billed, paid, balance: Math.max(billed - paid, 0) };
  }, [invoices]);

  if (error && !subscription) {
    return (
      <div className="p-10">
        <div className="max-w-5xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-10 text-neutral-500">
        Loading billing details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 rounded-2xl border border-neutral-800 bg-neutral-950 flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold">Billing History</h1>

            <p className="text-sm text-neutral-500">
              {subscription.packageName} • {subscription.serviceName}
            </p>
          </div>
        </div>

        {/* OVERALL SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <p className="text-xs text-neutral-500">Total Billed</p>
            <p className="mt-2 text-xl font-bold">{money(totals.billed)}</p>
            <p className="mt-1 text-xs text-neutral-600">
              {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <p className="text-xs text-neutral-500">Total Paid</p>
            <p className="mt-2 text-xl font-bold text-lime-400">
              {money(totals.paid)}
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <p className="text-xs text-neutral-500">Total Balance</p>
            <p className="mt-2 text-xl font-bold text-yellow-400">
              {money(totals.balance)}
            </p>
          </div>
        </div>

        {invoices.length === 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-neutral-500">
            This membership has no invoice linked.
          </div>
        )}

        {/* INVOICES */}
        <div className="space-y-6">
          {invoices.map(({ label, invoice }) => {
            const paid = sumPaid(invoice.payments);
            const balance = invoiceBalance(invoice);

            return (
              <div
                key={invoice.id}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"
              >
                {/* INVOICE HEADER */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-neutral-500">
                      {label}
                    </p>

                    <h2 className="text-xl font-bold mt-1">
                      {invoice.packageName}
                    </h2>

                    <p className="text-sm text-neutral-400 mt-1">
                      {invoice.invoiceNumber} • {invoice.serviceName}
                    </p>

                    <p className="text-xs text-neutral-600 mt-1">
                      Created{" "}
                      {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
                    </p>

                    <div className="mt-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${statusClass(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    {balance > 0 && invoice.status !== "CANCELLED" && (
                      <button
                        onClick={() => setCollectTarget(invoice)}
                        className="h-10 px-4 rounded-xl bg-lime-400 text-black font-semibold"
                      >
                        Collect Balance
                      </button>
                    )}

                    <button
                      onClick={() =>
                        window.open(`/api/invoice/${invoice.id}`, "_blank")
                      }
                      className="h-10 px-4 rounded-xl border border-neutral-700 flex items-center gap-2"
                    >
                      <Download size={16} />
                      Download Invoice
                    </button>
                  </div>
                </div>

                {/* SUMMARY */}
                <div className="flex flex-wrap gap-2 mt-6">
                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Package Price</p>
                    <p className="mt-2 font-medium">
                      {money(invoice.packageAmount)}
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Discount</p>
                    <p className="mt-2 font-medium text-red-400">
                      {money(invoice.discountAmount)}
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">GST</p>
                    <p className="mt-2 font-medium">{money(invoiceTax(invoice))}</p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Final Amount</p>
                    <p className="mt-2 font-medium text-red-400">
                      {money(invoiceTotal(invoice))}
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Paid</p>
                    <p className="mt-2 font-medium text-lime-400">{money(paid)}</p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Balance</p>
                    <p className="mt-2 font-medium text-yellow-400">
                      {money(balance)}
                    </p>
                  </div>
                </div>

                {/* NOTES (e.g. "Upgrade: Monthly → Annual") */}
                {invoice.notes && invoice.intent === "UPGRADE" && (
                  <p className="mt-4 text-sm text-neutral-500">{invoice.notes}</p>
                )}

                {/* PAYMENTS */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Payment History</h3>

                  {!invoice.payments.length ? (
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-neutral-500">
                      No payments recorded
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoice.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4"
                        >
                          <div>
                            <p className="font-medium">{payment.receiptNumber}</p>
                            <p className="text-sm text-neutral-400">
                              {payment.paymentMode}
                            </p>
                          </div>

                          <div className="flex gap-2 items-center">
                            <div className="text-right">
                              <p className="font-semibold text-lime-400">
                                {money(payment.amount)}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {new Date(payment.paidAt).toLocaleDateString()}
                              </p>
                            </div>

                            {payment.status === "PAID" && (
                              <button
                                onClick={() =>
                                  window.open(
                                    `/api/receipt/${payment.id}`,
                                    "_blank"
                                  )
                                }
                                className="h-10 px-4 rounded-xl border border-neutral-700"
                              >
                                Receipt
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* COLLECT BALANCE (one modal, any invoice) */}
        {collectTarget && (
          <CollectBalanceModal
            balanceAmount={invoiceBalance(collectTarget)}
            invoiceId={collectTarget.id}
            member={{
              name: collectTarget.memberName ?? "",
              email: collectTarget.memberEmail ?? "",
              phone: collectTarget.memberPhone ?? "",
            }}
            open={!!collectTarget}
            onClose={() => setCollectTarget(null)}
            onSuccess={() => {
              setCollectTarget(null);
              void fetchSubscription();
            }}
          />
        )}
      </div>
    </div>
  );
}