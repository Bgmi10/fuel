"use client";

import { useEffect, useState } from "react";
import { ScheduleTrialModal } from "./ScheduleTrialModal";

type Trial = {
  id: string;
  name: string;
  phone: string;
  goal: string;
  preferredTime: string;
  status: "PENDING" | "SCHEDULED" | "CONFIRMED_BY_USER" | "CANCELLED_BY_USER";
  createdAt: string;
  scheduledDate?: string;
};

export const Trial = () => {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState(""); // 🔥 NEW

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null);

  // ---------------- FETCH ----------------
  const fetchTrials = async () => {
    setLoading(true);
    const res = await fetch("/api/trial");
    const data = await res.json();
    setTrials(data.trials || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrials();
  }, []);

  // ---------------- OPTIMISTIC UPDATE ----------------
  const updateTrial = (id: string, data: Partial<Trial>) => {
    setTrials((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    );
  };

  // ---------------- STATUS UPDATE ----------------
  const updateStatus = async (id: string, status: Trial["status"]) => {
    updateTrial(id, { status });

    try {
      await fetch(`/api/trial/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- FILTER + SEARCH ----------------
  const filteredTrials = trials.filter((t) => {
    // FILTER
    const statusMatch =
      filter === "ALL"
        ? true
        : filter === "TODAY"
        ? new Date(t.createdAt).toDateString() ===
          new Date().toDateString()
        : t.status === filter;

    // SEARCH
    const searchMatch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search) ||
      t.goal.toLowerCase().includes(search.toLowerCase());

    return statusMatch && searchMatch;
  });

  // ---------------- STATUS COLORS ----------------
  const statusColor: Record<string, string> = {
    PENDING: "text-yellow-400",
    SCHEDULED: "text-blue-400",
    CONFIRMED_BY_USER: "text-green-400",
    CANCELLED_BY_USER: "text-red-400",
  };

  return (
    <div className="p-4">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">

        <div>
          <h2 className="text-2xl font-bold text-white">
            Trial Bookings
          </h2>
          <p className="text-neutral-500 text-sm">
            Manage all incoming gym trials
          </p>
        </div>

        {/* 🔥 SEARCH */}
        <div className="flex mt-4 gap-2">

        <input
          type="text"
          placeholder="Search name, phone, goal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 bg-neutral-800 text-white rounded-md border border-neutral-700 w-full md:w-64 outline-none focus:border-lime-400"
        />

        {/* FILTER */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-neutral-800 text-white rounded-md border border-neutral-700"
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="CONFIRMED_BY_USER">Confirmed</option>
          <option value="CANCELLED_BY_USER">Cancelled</option>
          <option value="TODAY">Today</option>
        </select>
      </div>
      </div>
 

      {/* TABLE */}
      <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-xl">
        <table className="w-full text-sm text-left">

          <thead className="text-neutral-400 border-b border-neutral-800">
            <tr>
              <th className="p-4">Name</th>
              <th>Phone</th>
              <th>Goal</th>
              <th>Preferred</th>
              <th>Scheduled</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredTrials.map((t) => (
              <tr
                key={t.id}
                className="border-b border-neutral-800 hover:bg-neutral-800/40"
              >
                <td className="p-4 text-white font-medium">{t.name}</td>
                <td className="text-neutral-300">{t.phone}</td>
                <td className="text-neutral-400">{t.goal}</td>
                <td className="text-neutral-400">{t.preferredTime}</td>

                <td className="text-neutral-400 text-xs">
                  {t.scheduledDate
                    ? new Date(t.scheduledDate).toLocaleString()
                    : "-"}
                </td>

                <td className={`text-xs font-semibold ${statusColor[t.status]}`}>
                  {t.status}
                </td>

                <td className="p-2 flex gap-2 flex-wrap">

                  {t.status === "PENDING" && (
                    <button
                      onClick={() => {
                        setSelectedTrial(t);
                        setScheduleOpen(true);
                      }}
                      className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded"
                    >
                      Schedule
                    </button>
                  )}

                  {t.status === "SCHEDULED" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedTrial(t);
                          setScheduleOpen(true);
                        }}
                        className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded"
                      >
                        Reschedule
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(t.id, "CONFIRMED_BY_USER")
                        }
                        className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded"
                      >
                        Mark Confirmed
                      </button>
                    </>
                  )}

                  {t.status === "CANCELLED_BY_USER" && (
                    <>
                      <span className="text-red-400 text-xs">❌ Cancelled</span>
                      <button
                        onClick={() => {
                          setSelectedTrial(t);
                          setScheduleOpen(true);
                        }}
                        className="px-3 py-1 text-xs bg-purple-500/20 text-purple-400 rounded"
                      >
                        Re-schedule
                      </button>
                    </>
                  )}

                  {t.status === "CONFIRMED_BY_USER" && (
                    <span className="text-green-400 text-xs">
                      ✅ Confirmed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* MODAL */}
      {selectedTrial && (
        <ScheduleTrialModal
          open={scheduleOpen}
          setOpen={setScheduleOpen}
          trialId={selectedTrial.id}
          phone={selectedTrial.phone}
          name={selectedTrial.name}
          onScheduled={(id, scheduledDate) => {
            updateTrial(id, {
              status: "SCHEDULED",
              scheduledDate,
            });
          }}
        />
      )}

      {loading && (
        <p className="text-neutral-500 mt-4">Loading...</p>
      )}
    </div>
  );
};