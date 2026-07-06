"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  trialId: string;
  phone: string;
  name: string;
  onScheduled?: (id: string, date: string) => void;
};

export const ScheduleTrialModal = ({
  open,
  setOpen,
  trialId,
  phone,
  name,
  onScheduled,
}: Props) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  // ---------------- BUILD ISO DATE ----------------
  const buildDateTime = () => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}`).toISOString();
  };

  // ---------------- HANDLE SUBMIT ----------------
  const handleSchedule = async () => {
    const scheduledDate = buildDateTime();

    if (!date || !time || !scheduledDate) {
      alert("Please select date and time");
      return;
    }

    try {
      setLoading(true);

      // 1. Save schedule
      const res = await fetch(`/api/trial/${trialId}/schedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledDate,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert("Failed to schedule");
        return;
      }

      // 2. Optimistic update callback
      onScheduled?.(trialId, scheduledDate);

      // 3. WhatsApp trigger
      await fetch("/api/trial/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          date: date,
          time: time,
          name: name
        }),
      });

      // 4. Cleanup
      setOpen(false);
      setDate("");
      setTime("");

      alert("Scheduled & WhatsApp sent 🚀");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- SLOTS ----------------
  const slots = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
  ];

  // ---------------- UI ----------------
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">

      {/* Blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">

        <h2 className="text-xl font-bold text-white text-center">
          Schedule Trial
        </h2>

        <p className="text-neutral-500 text-sm text-center mt-1">
          Set schedule for {name}
        </p>

        <div className="mt-6 space-y-4">

          {/* DATE */}
          <input
            type="date"
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
            onChange={(e) => setDate(e.target.value)}
          />

          {/* TIME */}
          <select
            className="w-full px-4 py-3 rounded-md bg-neutral-800 text-white border border-neutral-700 focus:border-lime-400 outline-none"
            onChange={(e) => setTime(e.target.value)}
            value={time}
          >
            <option value="">Select Time Slot</option>

            {slots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>

          {/* BUTTON */}
          <button
            onClick={handleSchedule}
            disabled={loading}
            className="w-full py-3 rounded-md bg-lime-400 text-black font-semibold
                       hover:bg-lime-300 transition disabled:opacity-50"
          >
            {loading ? "Scheduling..." : "Schedule & Send WhatsApp"}
          </button>

        </div>
      </div>
    </div>
  );
};