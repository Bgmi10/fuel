

"use client";

import { useState } from "react";

type Props = {
  payment: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const EditPaymentModal = ({
  payment,
  open,
  onClose,
  onSuccess,
}: Props) => {
  const [loading, setLoading] =
    useState(false);

  const [amount, setAmount] =
    useState(payment.amount / 100);

  const [paymentMode, setPaymentMode] =
    useState(payment.paymentMode);

  const [notes, setNotes] =
    useState(payment.notes || "");

  const submit = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/invoices/payments/${payment.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            amount: amount * 100,
            paymentMode,
            notes,
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message);
        return;
      }

      onSuccess();

      onClose();
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5">

      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

        <h2 className="text-2xl font-bold">
          Edit Payment
        </h2>

        <p className="text-sm text-neutral-400 mt-2">
          Update payment details and
          recalculate invoice totals.
        </p>

        <div className="space-y-5 mt-6">

          {/* AMOUNT */}
          <div>
            <label className="text-sm text-neutral-400 block mb-2">
              Amount
            </label>

            <input
              type="number"
              value={amount}
              onChange={(e) =>
                setAmount(
                  Number(e.target.value)
                )
              }
              className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4"
            />
          </div>

          {/* PAYMENT MODE */}
          <div>
            <label className="text-sm text-neutral-400 block mb-2">
              Payment Mode
            </label>

            <select
              value={paymentMode}
              onChange={(e) =>
                setPaymentMode(
                  e.target.value
                )
              }
              className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4"
            >
              <option value="CASH">
                Cash
              </option>

              <option value="UPI">
                UPI
              </option>

              <option value="CARD">
                Card
              </option>

              <option value="BANK_TRANSFER">
                Bank Transfer
              </option>
            </select>
          </div>

          {/* NOTES */}
          <div>
            <label className="text-sm text-neutral-400 block mb-2">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(
                  e.target.value
                )
              }
              className="w-full h-32 rounded-2xl bg-neutral-950 border border-neutral-800 p-4"
            />
          </div>

        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            className="h-11 px-5 rounded-2xl border border-neutral-700"
          >
            Close
          </button>

          <button
            disabled={loading}
            onClick={submit}
            className="h-11 px-5 rounded-2xl bg-lime-400 text-black font-semibold"
          >
            {loading
              ? "Updating..."
              : "Update Payment"}
          </button>

        </div>

      </div>

    </div>
  );
};