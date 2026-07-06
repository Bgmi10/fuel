"use client";

import { useState } from "react";

type Props = {
  invoice: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const EditInvoiceModal = ({
  invoice,
  open,
  onClose,
  onSuccess,
}: Props) => {
  const [loading, setLoading] =
    useState(false);

  const [discountAmount, setDiscountAmount] =
    useState(invoice.discountAmount / 100);

  const [startDate, setStartDate] =
    useState(
      invoice.subscription?.startDate?.split(
        "T"
      )[0]
    );

  const [endDate, setEndDate] =
    useState(
      invoice.subscription?.endDate?.split(
        "T"
      )[0]
    );

  const [notes, setNotes] =
    useState(invoice.notes || "");

  const submit = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/invoices/${invoice.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            discountAmount:
              discountAmount * 100,

            startDate,
            endDate,
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

      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6">

        <h2 className="text-2xl font-bold mb-6">
          Edit Invoice
        </h2>

        <div className="space-y-5">

          <div>
            <label className="text-sm text-neutral-400 block mb-2">
              Discount Amount
            </label>

            <input
              type="number"
              value={discountAmount}
              onChange={(e) =>
                setDiscountAmount(
                  Number(e.target.value)
                )
              }
              className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="text-sm text-neutral-400 block mb-2">
                Start Date
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(
                    e.target.value
                  )
                }
                className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4"
              />
            </div>

            <div>
              <label className="text-sm text-neutral-400 block mb-2">
                End Date
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
                className="w-full h-12 rounded-2xl bg-neutral-950 border border-neutral-800 px-4"
              />
            </div>

          </div>

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
              className="w-full rounded-2xl bg-neutral-950 border border-neutral-800 p-4 h-32"
            />
          </div>

        </div>

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
            className="h-11 px-5 rounded-2xl bg-lime-400 text-black font-semibold"
          >
            {loading
              ? "Updating..."
              : "Update Invoice"}
          </button>

        </div>

      </div>

    </div>
  );
};