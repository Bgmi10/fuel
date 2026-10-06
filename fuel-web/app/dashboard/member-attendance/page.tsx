"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

import {
  AlertCircle,
  Calendar,
  ChevronDown,
  Clock,
  Download,
  Filter,
  Radio,
  RefreshCcw,
  Search,
  Users,
  X,
} from "lucide-react";

/* ============================================================
 * TYPES
 * ============================================================ */

type AttendanceRecord = {
  id: string;
  checkInAt: string;
  dateKey: string;
  sessionDeducted: boolean;
  member: {
    id: string;
    name: string;
    phone: string;
    profileImage: string | null;
  };
  branch: { id: string; name: string };
  subscription: {
    id: string;
    packageName: string;
    serviceName: string;
    usageType: "DURATION_BASED" | "SESSION_BASED";
    totalSessions: number | null;
    remainingSessions: number | null;
    endDate: string;
  };
  slot: { name: string; startTime: string; endTime: string } | null;
};

type Summary = {
  totalCheckIns: number;
  uniqueMembers: number;
  sessionsDeducted: number;
  topSlot: { label: string; count: number } | null;
  byDay: { dateKey: string; count: number }[];
};

type Option = { id: string; name: string };

/* ============================================================
 * DATE HELPERS (gym time = Asia/Kolkata)
 * ============================================================ */

const dateKeyOf = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));

const formatDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
};

const LOW_SESSIONS = 2;
const LIVE_REFRESH_MS = 30_000;

/* ============================================================
 * PAGE
 * ============================================================ */

const Page = () => {
  const router = useRouter();

  const today = dateKeyOf(new Date());

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [branches, setBranches] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [truncated, setTruncated] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("ALL");
  const [serviceId, setServiceId] = useState("ALL");
  const [onlyLowSessions, setOnlyLowSessions] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [live, setLive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  /* ----------------------------------------------------------
   * FETCH
   * ---------------------------------------------------------- */

  const fetchAttendance = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const query = new URLSearchParams({ from, to });

        if (branchId !== "ALL") query.set("branchId", branchId);
        if (serviceId !== "ALL") query.set("serviceId", serviceId);

        const res = await fetch(`/api/members/attendance?${query.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Unable to load attendance.");
        }

        setRecords(data.records ?? []);
        setSummary(data.summary ?? null);
        setTruncated(Boolean(data.truncated));
        setBranches(data.filters?.branches ?? []);
        setServices(data.filters?.services ?? []);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load attendance."
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [from, to, branchId, serviceId]
  );

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  // Live mode: quiet auto-refresh, only while the tab is visible
  useEffect(() => {
    if (!live) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchAttendance(true);
      }
    }, LIVE_REFRESH_MS);

    return () => clearInterval(timer);
  }, [live, fetchAttendance]);

  /* ----------------------------------------------------------
   * PRESETS
   * ---------------------------------------------------------- */

  const presets = useMemo(() => {
    const monthStart = `${today.slice(0, 8)}01`;

    return [
      { label: "Today", from: today, to: today },
      { label: "Yesterday", from: addDays(today, -1), to: addDays(today, -1) },
      { label: "Last 7 days", from: addDays(today, -6), to: today },
      { label: "This month", from: monthStart, to: today },
    ];
  }, [today]);

  const activePreset = presets.find((p) => p.from === from && p.to === to);

  /* ----------------------------------------------------------
   * CLIENT FILTERS (search + low sessions)
   * ---------------------------------------------------------- */

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !term ||
        record.member.name.toLowerCase().includes(term) ||
        record.member.phone.toLowerCase().includes(term);

      const remaining = record.subscription.remainingSessions;

      const matchesLow =
        !onlyLowSessions ||
        (record.subscription.usageType === "SESSION_BASED" &&
          remaining !== null &&
          remaining <= LOW_SESSIONS);

      return matchesSearch && matchesLow;
    });
  }, [records, search, onlyLowSessions]);

  const selectedRecords = useMemo(() => {
    const set = new Set(selectedIds);
    return filtered.filter((record) => set.has(record.id));
  }, [filtered, selectedIds]);

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));

  const toggleOne = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );

  const toggleAll = () => {
    if (allSelected) {
      const ids = new Set(filtered.map((r) => r.id));
      setSelectedIds((current) => current.filter((id) => !ids.has(id)));
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      filtered.forEach((r) => next.add(r.id));
      return Array.from(next);
    });
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    branchId !== "ALL" ||
    serviceId !== "ALL" ||
    onlyLowSessions ||
    from !== today ||
    to !== today;

  const clearFilters = () => {
    setSearch("");
    setBranchId("ALL");
    setServiceId("ALL");
    setOnlyLowSessions(false);
    setFrom(today);
    setTo(today);
  };

  /* ----------------------------------------------------------
   * EXPORT
   * ---------------------------------------------------------- */

  const exportToExcel = () => {
    const rows = selectedRecords.length > 0 ? selectedRecords : filtered;

    if (rows.length === 0) {
      window.alert("There is no attendance to export.");
      return;
    }

    setExporting(true);

    try {
      const excelRows = rows.map((r, index) => ({
        "S.No": index + 1,
        Date: formatDay(r.dateKey),
        "Check-in Time": formatTime(r.checkInAt),
        Member: r.member.name,
        Phone: r.member.phone,
        Branch: r.branch.name,
        Service: r.subscription.serviceName,
        Package: r.subscription.packageName,
        Slot: r.slot ? `${r.slot.name} (${r.slot.startTime}-${r.slot.endTime})` : "",
        "Membership Type":
          r.subscription.usageType === "SESSION_BASED" ? "Session" : "Duration",
        "Session Deducted": r.sessionDeducted ? "Yes" : "No",
        "Sessions Remaining": r.subscription.remainingSessions ?? "",
        "Sessions Total": r.subscription.totalSessions ?? "",
      }));

      const sheet = XLSX.utils.json_to_sheet(excelRows);

      sheet["!cols"] = [
        { wch: 8 },
        { wch: 14 },
        { wch: 14 },
        { wch: 24 },
        { wch: 16 },
        { wch: 20 },
        { wch: 18 },
        { wch: 24 },
        { wch: 26 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 14 },
      ];

      sheet["!autofilter"] = { ref: `A1:M${excelRows.length + 1}` };

      const branchName =
        branchId === "ALL"
          ? "All branches"
          : branches.find((b) => b.id === branchId)?.name || branchId;

      const serviceName =
        serviceId === "ALL"
          ? "All services"
          : services.find((s) => s.id === serviceId)?.name || serviceId;

      const summarySheet = XLSX.utils.aoa_to_sheet([
        ["Attendance Export"],
        [],
        ["Exported At", new Date().toLocaleString("en-IN")],
        ["Records Exported", rows.length],
        [
          "Export Type",
          selectedRecords.length > 0 ? "Selected rows" : "All filtered rows",
        ],
        [],
        ["Applied Filters", "Value"],
        ["From", from],
        ["To", to],
        ["Branch", branchName],
        ["Service", serviceName],
        ["Search", search || "All"],
        ["Low sessions only", onlyLowSessions ? "Yes" : "No"],
      ]);

      summarySheet["!cols"] = [{ wch: 25 }, { wch: 35 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Attendance");
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Applied Filters");

      XLSX.writeFile(workbook, `attendance_${from}_to_${to}.xlsx`, {
        compression: true,
      });

      setSelectedIds([]);
    } catch (err) {
      console.error("Excel export failed:", err);
      window.alert("Failed to export attendance.");
    } finally {
      setExporting(false);
    }
  };

  /* ----------------------------------------------------------
   * DERIVED
   * ---------------------------------------------------------- */

  const maxDayCount = Math.max(...(summary?.byDay.map((d) => d.count) ?? [1]), 1);
  const showDayChart = (summary?.byDay.length ?? 0) > 1;

  /* ----------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Member check-ins verified at the gym
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
              live
                ? "border-lime-400/30 bg-lime-400/10 text-lime-300"
                : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <Radio size={16} className={live ? "animate-pulse" : ""} />
            {live ? "Live: on" : "Live"}
          </button>

          <button
            type="button"
            onClick={() => void fetchAttendance()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            disabled={exporting || filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-lime-400/30 bg-lime-400/10 px-4 py-2 text-sm font-semibold text-lime-300 transition hover:bg-lime-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            {exporting
              ? "Exporting..."
              : selectedRecords.length > 0
                ? `Export ${selectedRecords.length}`
                : `Export ${filtered.length}`}
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Check-ins"
          value={summary?.totalCheckIns ?? 0}
          icon={<Clock size={16} />}
        />
        <StatCard
          label="Unique Members"
          value={summary?.uniqueMembers ?? 0}
          icon={<Users size={16} />}
        />
        <StatCard
          label="Sessions Deducted"
          value={summary?.sessionsDeducted ?? 0}
        />
        <StatCard
          label="Busiest Slot"
          value={summary?.topSlot?.label ?? "-"}
          hint={summary?.topSlot ? `${summary.topSlot.count} check-ins` : undefined}
          small
        />
      </div>

      {/* DAILY TREND (only for multi-day ranges) */}

      {showDayChart && summary && (
        <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Check-ins per day
          </p>

          <div className="flex h-24 items-end gap-1 overflow-x-auto">
            {summary.byDay.map((day) => (
              <div
                key={day.dateKey}
                className="group flex min-w-[14px] flex-1 flex-col items-center justify-end"
                title={`${formatDay(day.dateKey)}: ${day.count}`}
              >
                <span className="mb-1 text-[10px] text-neutral-500 opacity-0 group-hover:opacity-100">
                  {day.count}
                </span>
                <div
                  className="w-full rounded-t bg-lime-400/70 group-hover:bg-lime-400"
                  style={{
                    height: `${Math.max((day.count / maxDayCount) * 100, 6)}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH + FILTERS */}

      <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />

            <input
              placeholder="Search by member name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-black py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-400/50"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
              showFilters || hasActiveFilters
                ? "border-lime-400/30 bg-lime-400/10 text-lime-300"
                : "border-neutral-800 bg-black text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            <Filter size={16} />
            Filters
            <ChevronDown
              size={15}
              className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* PRESETS */}

        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setFrom(preset.from);
                setTo(preset.to);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                activePreset?.label === preset.label
                  ? "border-lime-400/40 bg-lime-400/10 text-lime-300"
                  : "border-neutral-800 text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="mt-4 border-t border-neutral-800 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DateFilter
                label="From"
                value={from}
                max={to}
                onChange={(value) => value && setFrom(value)}
              />

              <DateFilter
                label="To"
                value={to}
                min={from}
                onChange={(value) => value && setTo(value)}
              />

              <FilterSelect
                label="Branch"
                value={branchId}
                onChange={setBranchId}
                options={[
                  { value: "ALL", label: "All Branches" },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />

              <FilterSelect
                label="Service"
                value={serviceId}
                onChange={setServiceId}
                options={[
                  { value: "ALL", label: "All Services" },
                  ...services.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />

              <label className="flex h-[42px] cursor-pointer items-center gap-2 self-end rounded-lg border border-neutral-800 bg-black px-3 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={onlyLowSessions}
                  onChange={(e) => setOnlyLowSessions(e.target.checked)}
                  className="h-4 w-4 accent-lime-400"
                />
                {LOW_SESSIONS} or fewer sessions left
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-black px-4 text-sm font-medium text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X size={15} />
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RESULT SUMMARY */}

      <div className="mb-4 flex flex-col gap-2 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing{" "}
          <span className="font-semibold text-white">{filtered.length}</span> of{" "}
          <span className="font-semibold text-white">{records.length}</span>{" "}
          check-ins
          {from === to
            ? ` on ${formatDay(from)}`
            : ` from ${formatDay(from)} to ${formatDay(to)}`}
        </div>

        {selectedRecords.length > 0 && (
          <div className="text-lime-300">{selectedRecords.length} selected</div>
        )}
      </div>

      {truncated && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          Only the latest 5,000 check-ins are shown. Narrow the date range or
          filters to see everything.
        </div>
      )}

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="w-12 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={filtered.length === 0}
                    className="h-4 w-4 cursor-pointer accent-lime-400"
                  />
                </th>
                <th className="px-4 py-4 text-left">Member</th>
                <th className="px-4 py-4 text-left">Check-in</th>
                <th className="px-4 py-4 text-left">Slot</th>
                <th className="px-4 py-4 text-left">Service / Package</th>
                <th className="px-4 py-4 text-left">Branch</th>
                <th className="px-4 py-4 text-left">Sessions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((record) => {
                const isSelected = selectedIds.includes(record.id);
                const sub = record.subscription;
                const isSession = sub.usageType === "SESSION_BASED";
                const remaining = sub.remainingSessions;
                const low =
                  isSession && remaining !== null && remaining <= LOW_SESSIONS;

                const go = () =>
                  router.push(`/dashboard/members/${record.member.id}`);

                return (
                  <tr
                    key={record.id}
                    className={`border-b border-neutral-800 transition ${
                      isSelected
                        ? "bg-lime-400/[0.04]"
                        : "hover:bg-neutral-800/40"
                    }`}
                  >
                    <td
                      className="px-4 py-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(record.id)}
                        className="h-4 w-4 cursor-pointer accent-lime-400"
                      />
                    </td>

                    <td className="cursor-pointer px-4 py-4" onClick={go}>
                      <div className="font-medium text-white">
                        {record.member.name}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {record.member.phone}
                      </div>
                    </td>

                    <td className="cursor-pointer px-4 py-4" onClick={go}>
                      <div className="font-medium text-white">
                        {formatTime(record.checkInAt)}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {formatDay(record.dateKey)}
                      </div>
                    </td>

                    <td
                      className="cursor-pointer px-4 py-4 text-neutral-300"
                      onClick={go}
                    >
                      {record.slot ? (
                        <>
                          <div>{record.slot.name}</div>
                          <div className="mt-0.5 text-xs text-neutral-500">
                            {record.slot.startTime} - {record.slot.endTime}
                          </div>
                        </>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>

                    <td
                      className="cursor-pointer px-4 py-4 text-neutral-300"
                      onClick={go}
                    >
                      <div>{sub.serviceName}</div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {sub.packageName}
                      </div>
                    </td>

                    <td
                      className="cursor-pointer px-4 py-4 text-neutral-400"
                      onClick={go}
                    >
                      {record.branch.name}
                    </td>

                    <td className="cursor-pointer px-4 py-4" onClick={go}>
                      {isSession ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                            low
                              ? "bg-red-500/20 text-red-400"
                              : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          {remaining ?? 0} / {sub.totalSessions ?? "-"} left
                        </span>
                      ) : (
                        <span className="rounded-md bg-neutral-700 px-2 py-1 text-xs text-neutral-300">
                          Duration
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
              <Search size={20} className="text-neutral-500" />
            </div>

            <p className="text-sm font-medium text-white">
              No check-ins found
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Try another date range or change your filters.
            </p>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 text-sm text-neutral-500">Loading attendance...</div>
      )}
    </div>
  );
};

export default Page;

/* ============================================================
 * SMALL COMPONENTS
 * ============================================================ */

const StatCard = ({
  label,
  value,
  hint,
  icon,
  small,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  small?: boolean;
}) => (
  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
    <div className="flex items-center justify-between text-neutral-500">
      <p className="text-xs">{label}</p>
      {icon}
    </div>

    <p
      className={`mt-2 truncate font-bold ${small ? "text-base" : "text-2xl"}`}
      title={String(value)}
    >
      {value}
    </p>

    {hint && <p className="mt-1 text-xs text-neutral-600">{hint}</p>}
  </div>
);

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-neutral-500">
      {label}
    </label>

    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[42px] w-full rounded-lg border border-neutral-800 bg-black px-3 text-sm text-white outline-none focus:border-lime-400/50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const DateFilter = ({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-neutral-500">
      {label}
    </label>

    <div className="relative">
      <Calendar
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
      />

      <input
        type="date"
        value={value}
        min={min}
        max={max}
        style={{ colorScheme: "dark" }}
        onChange={(e) => onChange(e.target.value)}
        className="h-[42px] w-full rounded-lg border border-neutral-800 bg-black pl-9 pr-3 text-sm text-white outline-none focus:border-lime-400/50"
      />
    </div>
  </div>
);