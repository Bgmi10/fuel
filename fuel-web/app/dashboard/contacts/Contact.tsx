"use client";

import { useEffect, useState } from "react";

type Inquiry = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  status: "PENDING" | "CONTACTED" | "RESOLVED";
  source: "WEB" | "INSTAGRAM" | "REFERRAL" | "WALKIN";
  createdAt: string;
};

export const Contact = () => {
  const [data, setData] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // ---------------- FETCH ----------------
  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/contact");
    const json = await res.json();
    setData(json.inquiries || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------------- OPTIMISTIC UPDATE ----------------
  const updateInquiry = (id: string, update: Partial<Inquiry>) => {
    setData((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...update } : i))
    );
  };

  // ---------------- STATUS UPDATE ----------------
  const updateStatus = async (
    id: string,
    status: Inquiry["status"]
  ) => {
    updateInquiry(id, { status });

    try {
      await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  // ---------------- FILTER + SEARCH ----------------
  const filtered = data.filter((i) => {
    const matchesFilter =
      filter === "ALL" || i.status === filter;

    const query = search.toLowerCase();

    const matchesSearch =
      i.name.toLowerCase().includes(query) ||
      i.phone.includes(query) ||
      (i.message || "").toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  // ---------------- STATUS COLORS ----------------
  const statusColor: Record<string, string> = {
    PENDING: "text-yellow-400",
    CONTACTED: "text-blue-400",
    RESOLVED: "text-green-400",
  };

  const sourceColor: Record<string, string> = {
    WEB: "text-neutral-400",
    INSTAGRAM: "text-pink-400",
    REFERRAL: "text-purple-400",
    WALKIN: "text-orange-400",
  };

  // ---------------- UI ----------------
  return (
    <div className="p-4">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <div>
          <h2 className="text-2xl font-bold text-white">
            Contact Inquiries
          </h2>
          <p className="text-neutral-500 text-sm">
            Manage all incoming leads
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex gap-2 mt-4">

          {/* t */}
          <input
            type="text"
            placeholder="Search name / phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 text-white rounded-md border border-neutral-700 outline-none focus:border-lime-400 text-sm"
          />

          {/* FILTER */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-neutral-800 text-white rounded-md border border-neutral-700 text-sm"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="CONTACTED">Contacted</option>
            <option value="RESOLVED">Resolved</option>
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
              <th>Email</th>
              <th>Message</th>
              <th>Source</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((i) => (
              <tr
                key={i.id}
                className="border-b border-neutral-800 hover:bg-neutral-800/40"
              >

                <td className="p-4 text-white font-medium">
                  {i.name}
                </td>

                <td className="text-neutral-300">
                  {i.phone}
                </td>

                <td className="text-neutral-400 text-xs">
                  {i.email || "-"}
                </td>

                <td className="text-neutral-500 text-xs max-w-[220px] truncate">
                  {i.message || "-"}
                </td>

                <td className={`text-xs font-semibold ${sourceColor[i.source]}`}>
                  {i.source}
                </td>

                <td className={`text-xs font-semibold ${statusColor[i.status]}`}>
                  {i.status}
                </td>

                <td className="p-2 flex gap-2 flex-wrap">

                  {i.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus(i.id, "CONTACTED")}
                      className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                    >
                      Mark Contacted
                    </button>
                  )}

                  {i.status === "CONTACTED" && (
                    <button
                      onClick={() => updateStatus(i.id, "RESOLVED")}
                      className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                    >
                      Mark Resolved
                    </button>
                  )}

                  {i.status === "RESOLVED" && (
                    <span className="text-green-400 text-xs font-semibold">
                      ✅ Done
                    </span>
                  )}

                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* EMPTY STATE */}
      {!loading && filtered.length === 0 && (
        <p className="text-neutral-500 mt-4 text-center">
          No results found
        </p>
      )}

      {/* LOADING */}
      {loading && (
        <p className="text-neutral-500 mt-4">
          Loading...
        </p>
      )}
    </div>
  );
};