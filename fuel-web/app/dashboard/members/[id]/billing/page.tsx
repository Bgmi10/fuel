"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Wallet,
  CreditCard,
} from "lucide-react";

import { formatPaidAt } from "@/app/utils/helper";
import { CollectBalanceModal } from "../CollectBalanceModal";
import { EditInvoiceModal } from "../EditInvoiceModal";
import { EditPaymentModal } from "../EditPaymentModel";
import { VoidPaymentModal } from "../VoidPaymentModal";

export default function BillingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);

  const [openCollect, setOpenCollect] = useState(false);
  const [openEditInvoice, setOpenEditInvoice] = useState(false);
  const [openEditPayment, setOpenEditPayment] = useState(false);
  const [openVoidPayment, setOpenVoidPayment] = useState(false);

  const fetchMember = async () => {
    try {
      const res = await fetch(`/api/members/${id}`);
      const data = await res.json();

      setMember(data.member);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchMember();
  }, [id]);

  if (loading) return <div className="p-10 text-neutral-500">Loading...</div>;
  if (!member) return <div className="p-10 text-red-500">Member not found</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/dashboard/members/${id}`)}
              className="w-10 h-10 rounded-xl border border-neutral-800 flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-2xl font-bold">Billing & Payments</h1>
              <p className="text-sm text-neutral-500">{member.name}</p>
            </div>
          </div>

          <button
            onClick={() =>
              router.push(`/dashboard/members/${id}/assignplan`)
            }
            className="h-11 px-5 rounded-2xl bg-lime-400 text-black font-semibold"
          >
            Add Billing
          </button>

        </div>

        {/* INVOICES */}
        <div className="space-y-6">

          {member.invoices.length === 0 ? (
            <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400">
              No invoices found
            </div>
          ) : (
            member.invoices.map((invoice: any) => (
              <div
                key={invoice.id}
                className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6"
              >

                {/* TOP */}
                <div className="flex items-start justify-between flex-wrap gap-5">

                  <div>
                    <h3 className="text-xl font-bold">
                      {invoice.invoiceNumber}
                    </h3>

                    <p className="text-neutral-400 text-sm mt-1">
                      {invoice.branchName} • {invoice.serviceName} • {invoice.packageName}
                    </p>

                    <div className="mt-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          invoice.status === "FULLY_PAID"
                            ? "bg-lime-400/15 text-lime-400"
                            : invoice.status === "PARTIAL_PAID"
                            ? "bg-yellow-400/15 text-yellow-400"
                            : "bg-red-400/15 text-red-400"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-3 flex-wrap">

                    {invoice.status !== "FULLY_PAID" && (
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setOpenEditInvoice(true);
                        }}
                        className="h-10 px-4 rounded-xl border border-neutral-700"
                      >
                        Edit
                      </button>
                    )}

                    {invoice.status !== "FULLY_PAID" && (
                      <button
                        onClick={async () => {
                          const ok = confirm("Cancel invoice?");
                          if (!ok) return;

                          await fetch(`/api/invoices/${invoice.id}`, {
                            method: "DELETE",
                          });

                          fetchMember();
                        }}
                        className="h-10 px-4 rounded-xl border border-red-500/40 text-red-400"
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      onClick={() =>
                        window.open(`/api/invoice/${invoice.id}`, "_blank")
                      }
                      className="h-10 px-4 rounded-xl border border-neutral-700 flex items-center gap-2"
                    >
                      <Download size={16} />
                      Invoice
                    </button>

                    {invoice.balanceAmount > 0 && (
                      <button
                        onClick={() => {
                          setSelectedInvoiceId(invoice.id);
                          setPendingAmount(invoice.balanceAmount);
                          setOpenCollect(true);
                        }}
                        className="h-10 px-4 rounded-xl bg-lime-400 text-black font-semibold"
                      >
                        Collect Balance
                      </button>
                    )}

                  </div>
                </div>

                {/* SUMMARY */}
                <div className="grid md:grid-cols-5 gap-4 mt-6">

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Package</p>
                    <p>₹{(invoice.packageAmount / 100).toLocaleString()}</p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Discount</p>
                    <p className="text-red-400">
                      -₹{(invoice.discountAmount / 100).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Tax</p>
                    <p>
                      ₹{((invoice.totalTax || 0) / 100).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Paid</p>
                    <p className="text-lime-400">
                      ₹{(invoice.paidAmount / 100).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500">Balance</p>
                    <p className="text-yellow-400">
                      ₹{(invoice.balanceAmount / 100).toLocaleString()}
                    </p>
                  </div>

                </div>

                {/* PAYMENTS */}
                <div className="mt-6 space-y-3">

                  {invoice.payments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl flex justify-between flex-wrap gap-4"
                    >

                      <div>
                        <p className="font-semibold">
                          {payment.receiptNumber}
                        </p>

                        <p className="text-sm text-neutral-400">
                          {payment.paymentMode} • {formatPaidAt(payment.paidAt)}
                        </p>
                      </div>

                      <div className="flex gap-3 flex-wrap">

                        {payment.status === "PAID" && (
                          <button
                            onClick={() =>
                              window.open(`/api/receipt/${payment.id}`, "_blank")
                            }
                            className="h-10 px-4 rounded-xl border border-neutral-700"
                          >
                            Receipt
                          </button>
                        )}

                        {payment.status !== "VOIDED" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setOpenEditPayment(true);
                              }}
                              className="h-10 px-4 rounded-xl border border-neutral-700"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setOpenVoidPayment(true);
                              }}
                              className="h-10 px-4 rounded-xl border border-red-500/40 text-red-400"
                            >
                              Void
                            </button>
                          </>
                        )}

                      </div>

                    </div>
                  ))}

                </div>

              </div>
            ))
          )}

        </div>

        {/* MODALS */}
        {openCollect && (
          <CollectBalanceModal
            balanceAmount={pendingAmount}
            invoiceId={selectedInvoiceId}
            member={member}
            open={openCollect}
            onClose={() => setOpenCollect(false)}
            onSuccess={fetchMember}
          />
        )}

        {openEditInvoice && (
          <EditInvoiceModal
            invoice={selectedInvoice}
            open={openEditInvoice}
            onClose={() => setOpenEditInvoice(false)}
            onSuccess={fetchMember}
          />
        )}

        {openEditPayment && (
          <EditPaymentModal
            payment={selectedPayment}
            open={openEditPayment}
            onClose={() => setOpenEditPayment(false)}
            onSuccess={fetchMember}
          />
        )}

        {openVoidPayment && (
          <VoidPaymentModal
            payment={selectedPayment}
            open={openVoidPayment}
            onClose={() => setOpenVoidPayment(false)}
            onSuccess={fetchMember}
          />
        )}

      </div>
    </div>
  );
}