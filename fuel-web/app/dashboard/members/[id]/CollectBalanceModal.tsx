"use client";

import { useState } from "react";
import { X, CreditCard, Wallet } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;

  invoiceId: string | null;
  balanceAmount: number;

  member: {
    name: string;
    phone: string;
    email?: string;
  };

  onSuccess?: () => void;
};

const OFFLINE_METHODS = [
  "Cash",
  "GPay",
  "Bank Transfer",
  "Card",
];

export const CollectBalanceModal = ({
  open,
  onClose,
  invoiceId,
  balanceAmount,
  member,
  onSuccess,
}: Props) => {
  const [paymentType, setPaymentType] =
    useState<
      "RAZORPAY" | "OFFLINE"
    >("OFFLINE");

  const [offlineMethod, setOfflineMethod] =
    useState("Cash");

  const [amount, setAmount] = useState(
    (balanceAmount / 100).toString()
  );

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  if (!open) return null;

  const rupeesAmount =
    Number(amount) || 0;

  const paiseAmount =
    rupeesAmount * 100;

  const handleOfflinePayment =
    async () => {
      try {
        setLoading(true);

        const res = await fetch(
          "/api/payment/collect-balance/offline",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              invoiceId,

              amount:
                paiseAmount,

              paymentMode:
                offlineMethod,

              notes,
            }),
          }
        );

        const data =
          await res.json();

        if (!data.success) {
          alert(
            data.message ||
              "Failed"
          );

          return;
        }

        alert(
          "Balance collected successfully"
        );

        onSuccess?.();

        onClose();
      } catch (e) {
        console.log(e);

        alert(
          "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    };

  const handleRazorpayPayment =
    async () => {
      try {
        setLoading(true);

        const res = await fetch(
          "/api/payment/collect-balance/razorpay",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              invoiceId,

              amount:
                paiseAmount,

              notes,
            }),
          }
        );

        const data =
          await res.json();

        if (!data.success) {
          alert(
            data.message ||
              "Failed"
          );

          return;
        }

        const options = {
          key: data.key,

          amount: data.amount,

          currency: "INR",

          order_id: data.orderId,

          name: "Fuel Gym",

          description:
            "Balance Payment",

          prefill: {
            name: member.name,

            email: member.email,

            contact:
              member.phone,
          },

          theme: {
            color: "#A3E635",
          },

          handler: () => {
            alert(
              "Payment successful"
            );

            onSuccess?.();

            onClose();
          },
        };

        const rzp =
          new window.Razorpay(
            options
          );

        rzp.open();
      } catch (e) {
        console.log(e);

        alert(
          "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    };

  const handleSubmit = async () => {
    if (
      rupeesAmount <= 0
    ) {
      alert(
        "Invalid amount"
      );

      return;
    }

    if (
      paiseAmount >
      balanceAmount
    ) {
      alert(
        "Amount exceeds balance"
      );

      return;
    }

    if (
      paymentType ===
      "OFFLINE"
    ) {
      await handleOfflinePayment();
    } else {
      await handleRazorpayPayment();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">

      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto">


        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">

          <div>
            <h2 className="text-xl font-bold text-white">
              Collect Balance
            </h2>

            <p className="text-sm text-neutral-500 mt-1">
              Record pending payment
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X size={18} />
          </button>

        </div>

        {/* BODY */}
        <div className="p-6 space-y-6">

          {/* BALANCE */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">

            <p className="text-sm text-neutral-500">
              Pending Balance
            </p>

            <h3 className="text-3xl font-bold text-lime-400 mt-2">
              ₹
              {(
                balanceAmount / 100
              ).toLocaleString()}
            </h3>

          </div>

          {/* PAYMENT TYPE */}
          <div>

            <label className="text-sm text-neutral-400 block mb-3">
              Payment Collection Type
            </label>

            <div className="grid grid-cols-2 gap-4">

              <button
                type="button"
                onClick={() =>
                  setPaymentType(
                    "OFFLINE"
                  )
                }
                className={`h-14 rounded-2xl border flex items-center justify-center gap-2 transition ${
                  paymentType ===
                  "OFFLINE"
                    ? "border-lime-400 bg-lime-400/10 text-lime-400"
                    : "border-neutral-800 text-neutral-400"
                }`}
              >
                <Wallet size={18} />

                Offline
              </button>

              <button
                type="button"
                onClick={() =>
                  setPaymentType(
                    "RAZORPAY"
                  )
                }
                className={`h-14 rounded-2xl border flex items-center justify-center gap-2 transition ${
                  paymentType ===
                  "RAZORPAY"
                    ? "border-lime-400 bg-lime-400/10 text-lime-400"
                    : "border-neutral-800 text-neutral-400"
                }`}
              >
                <CreditCard
                  size={18}
                />

                Razorpay
              </button>

            </div>

          </div>

          {/* OFFLINE MODE */}
          {paymentType ===
            "OFFLINE" && (
            <div>

              <label className="text-sm text-neutral-400 block mb-2">
                Payment Method
              </label>

              <select
                value={
                  offlineMethod
                }
                onChange={(e) =>
                  setOfflineMethod(
                    e.target.value
                  )
                }
                className="w-full h-14 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 text-white outline-none focus:border-lime-400"
              >
                {OFFLINE_METHODS.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  )
                )}
              </select>

            </div>
          )}

          {/* AMOUNT */}
          <div>

            <label className="text-sm text-neutral-400 block mb-2">
              Collect Amount
            </label>

            <div className="relative">

              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
                ₹
              </div>

              <input
                type="number"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                className="w-full h-14 rounded-2xl bg-neutral-950 border border-neutral-800 pl-10 pr-4 text-white outline-none focus:border-lime-400"
                placeholder="Enter amount"
              />

            </div>

          </div>

          {/* NOTES */}
          <div>

            <label className="text-sm text-neutral-400 block mb-2">
              Notes
            </label>

            <textarea
              rows={4}
              value={notes}
              onChange={(e) =>
                setNotes(
                  e.target.value
                )
              }
              placeholder="Optional notes..."
              className="w-full rounded-2xl bg-neutral-950 border border-neutral-800 px-4 py-3 text-white outline-none focus:border-lime-400 resize-none"
            />

          </div>

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-neutral-800 flex gap-3">

          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl border border-neutral-700 text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-12 rounded-2xl bg-lime-400 text-black font-semibold disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : paymentType ===
                "RAZORPAY"
              ? "Continue To Payment"
              : "Collect Payment"}
          </button>

        </div>

      </div>

    </div>
  );
};