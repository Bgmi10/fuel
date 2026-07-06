"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  subscriptionId: string;
  onSuccess: () => void;
};

export const FreezeModal = ({
  open,
  onClose,
  subscriptionId,
  onSuccess,
}: Props) => {
  const [freezeStart, setFreezeStart] = useState("");
  const [freezeEnd, setFreezeEnd] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleFreeze = async () => {
    if (!freezeStart || !freezeEnd) {
      alert("Freeze start and end date required");
      return;
    }

    if (new Date(freezeEnd) <= new Date(freezeStart)) {
      alert("Freeze end must be after freeze start");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `/api/subscriptions/${subscriptionId}/freeze`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            freezeStart,
            freezeEnd,
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed to freeze");
        return;
      }

      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">

      <div className="bg-neutral-900 p-6 rounded-xl w-full max-w-md border border-neutral-800">

        {/* HEADER */}
        <h3 className="text-xl font-bold text-white mb-1">
          Freeze Subscription
        </h3>

        <p className="text-sm text-neutral-400 mb-5">
          Select freeze start and end dates.
        </p>

        {/* START DATE */}
        <div className="mb-4">
          <label className="text-xs text-neutral-500 mb-2 block">
            Freeze Start
          </label>

          <input
            type="date"
            value={freezeStart}
            onChange={(e) => setFreezeStart(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 text-white rounded border border-neutral-700 outline-none focus:border-lime-400"
          />
        </div>

        {/* END DATE */}
        <div className="mb-6">
          <label className="text-xs text-neutral-500 mb-2 block">
            Freeze End
          </label>

          <input
            type="date"
            value={freezeEnd}
            onChange={(e) => setFreezeEnd(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 text-white rounded border border-neutral-700 outline-none focus:border-lime-400"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">

          <button
            onClick={onClose}
            className="flex-1 py-2 bg-neutral-800 text-white rounded hover:bg-neutral-700 transition"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={handleFreeze}
            className="flex-1 py-2 bg-lime-400 text-black rounded font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : "Freeze"}
          </button>

        </div>
      </div>
    </div>
  );
};