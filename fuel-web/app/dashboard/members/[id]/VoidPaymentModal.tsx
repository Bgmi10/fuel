"use client";

import { useState } from "react";

type Props = {
  payment: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const VoidPaymentModal = ({
  payment,
  open,
  onClose,
  onSuccess,
}: Props) => {
  const [loading, setLoading] =
    useState(false);

  const [reason, setReason] =
    useState("");

  const submit = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/invoices/payments/${payment.id}`,
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            reason,
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
          Void Payment
        </h2>

        <p className="text-neutral-400 mt-2 text-sm">
          This action will void the payment
          and recalculate invoice totals.
        </p>

        <textarea
          value={reason}
          onChange={(e) =>
            setReason(
              e.target.value
            )
          }
          placeholder="Reason"
          className="w-full rounded-2xl bg-neutral-950 border border-neutral-800 p-4 h-32 mt-6"
        />

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            className="h-11 px-5 rounded-2xl border border-neutral-700"
          >
            Close
          </button>

          <button
            onClick={submit}
            disabled={loading}
            className="h-11 px-5 rounded-2xl bg-red-500 text-white font-semibold"
          >
            {loading
              ? "Voiding..."
              : "Void Payment"}
          </button>

        </div>

      </div>

    </div>
  );
};
