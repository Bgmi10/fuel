"use client";

import { paiseToRupees } from "@/app/utils/helper";
import { Invoice, Payment, Subscription } from "@prisma/client";
import { ArrowLeft, Download } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CollectBalanceModal } from "../../../CollectBalanceModal";

type SubscriptionType = Subscription & {
  invoice: Invoice & {
    payments: Payment[];
  };
};

export default function Page() {
  const { membershipId: id } = useParams();
  const router = useRouter();

  const [openCollect, setOpenCollect] = useState(false);

  const [subscription, setSubscription] =
    useState<SubscriptionType | null>(null);

  const fetchSubscription = async () => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`);
      const data = await res.json();

      setSubscription(data.subscription);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const invoice = subscription?.invoice;

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
        <div className="flex items-center justify-between mb-8">

          <div className="flex items-center gap-4">

            <button
              onClick={() => router.back()}
              className="w-11 h-11 rounded-2xl border border-neutral-800 bg-neutral-950 flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-2xl font-bold">
                Billing History
              </h1>

              <p className="text-sm text-neutral-500">
                {invoice?.invoiceNumber}
              </p>
            </div>

          </div>
          <div className="flex gap-2 items-center">

          {(invoice?.balanceAmount || 0) > 0 && (
                      <button
                        onClick={() => {
                          setOpenCollect(true);
                        }}
                        className="h-10 px-4 rounded-xl bg-lime-400 text-black font-semibold"
                      >
                        Collect Balance
                      </button>
                    )}

          {invoice && (
            <button
              onClick={() =>
                window.open(`/api/invoice/${invoice.id}`, "_blank")
              }
              className="h-11 px-5 rounded-2xl border border-neutral-700 flex items-center gap-2"
            >
              <Download size={16} />
              Download Invoice
            </button>
          )}

</div>


        </div>

        {/* INVOICE */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

          <div className="flex items-start justify-between flex-wrap gap-4">

            <div>
              <h2 className="text-xl font-bold">
                {invoice?.packageName}
              </h2>

              <p className="text-sm text-neutral-400 mt-1">
                {invoice?.serviceName}
              </p>

              <div className="mt-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    invoice?.status === "FULLY_PAID"
                      ? "bg-lime-400/15 text-lime-400"
                      : invoice?.status === "PARTIAL_PAID"
                      ? "bg-yellow-400/15 text-yellow-400"
                      : "bg-red-400/15 text-red-400"
                  }`}
                >
                  {invoice?.status}
                </span>
              </div>
            </div>

          </div>

          {/* SUMMARY */}
          <div className="flex flex-wrap gap-2 mt-6">

            <div className="bg-neutral-950 p-4 rounded-2xl">
              <p className="text-xs text-neutral-500">
                Package Price
              </p>

              <p className="mt-2 font-medium">
              ₹{paiseToRupees(invoice?.packageAmount || 0)}
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded-2xl">
              <p className="text-xs text-neutral-500">
                Discount
              </p>

              <p className="mt-2 font-medium text-red-400">
              ₹{paiseToRupees(invoice?.discountAmount || 0)}
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded-2xl">
              <p className="text-xs text-neutral-500">
                GST
              </p>

              <p className="mt-2 font-medium">
              ₹{paiseToRupees(invoice?.totalTax || 0)}
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded-2xl">
              <p className="text-xs text-neutral-500">
                Final Amount
              </p>

              <p className="mt-2 font-medium text-red-400">
              ₹{paiseToRupees(((invoice?.finalAmount || 0)  + (invoice?.totalTax || 0) - (invoice?.discountAmount || 0))|| 0)}
              </p>
            </div>


            <div className="bg-neutral-950 p-4 rounded-2xl">
              <p className="text-xs text-neutral-500">
                Paid
              </p>

              <p className="mt-2 font-medium text-lime-400">
              ₹{paiseToRupees(invoice?.paidAmount || 0)}
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded-2xl">
              <p className="text-xs text-neutral-500">
                Balance
              </p>

              <p className="mt-2 font-medium text-yellow-400">
              ₹{paiseToRupees(invoice?.balanceAmount || 0)}
              </p>
            </div>

          </div>

          {/* PAYMENTS */}
          <div className="mt-8">

            <h3 className="text-lg font-semibold mb-4">
              Payment History
            </h3>

            {!invoice?.payments?.length ? (
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
                      <p className="font-medium">
                        {payment.receiptNumber}
                      </p>

                      <p className="text-sm text-neutral-400">
                        {payment.paymentMode}
                      </p>
                    </div>

                   <div className="flex gap-2 items-center">

                    <div className="text-right">
                      <p className="font-semibold text-lime-400">
                      ₹{paiseToRupees(payment.amount)}
                      </p>

                      <p className="text-xs text-neutral-500">
                        {new Date(
                          payment.paidAt
                        ).toLocaleDateString()}
                      </p>
                      
                    </div>

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
                   </div>
                    

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>

        {openCollect && (
          <CollectBalanceModal
            balanceAmount={invoice?.balanceAmount ?? 0}
            invoiceId={invoice?.id ?? ""}
            member={{
              name: invoice?.memberName ?? '',
              email: invoice?.memberEmail ?? "",
              phone: invoice?.memberPhone ?? ""
            }}
            open={openCollect}
            onClose={() => setOpenCollect(false)}
            onSuccess={fetchSubscription}
          />
        )}

      </div>
    </div>
  );
}