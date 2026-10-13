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
  UserCheck,
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

type TodayStat = { count: number; uniqueMembers: number };

type Option = { id: string; name: string };

type SlotOption = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  branchId: string;
  serviceId: string;
  branchName: string;
};

type Filters = {
  search: string;
  from: string;
  to: string;
  branchId: string;
  serviceId: string;
  packageId: string;
  slotId: string;
  usageType: string;
  deducted: string;
  lowSessions: boolean;
};

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

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const formatTime = (value: string) => timeFormatter.format(new Date(value));

// Minutes since midnight, in gym time
const istMinutes = (value: string) => {
  const parts = clockFormatter.formatToParts(new Date(value));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
};

const clockToMinutes = (value: string) => {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

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

const slotLabel = (slot: { name: string; startTime: string; endTime: string }) =>
  `${slot.name} (${slot.startTime}-${slot.endTime})`;

/* ============================================================
 * PAGE
 * ============================================================ */

const Page = () => {
  const router = useRouter();

  const today = dateKeyOf(new Date());

  const defaultFilters: Filters = useMemo(
    () => ({
      search: "",
      from: today,
      to: today,
      branchId: "",
      serviceId: "",
      packageId: "",
      slotId: "",
      usageType: "",
      deducted: "",
      lowSessions: false,
    }),
    [today]
  );

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");

  // In-time range is applied on the loaded rows (time of day can't be
  // queried directly), so it does not trigger a refetch.
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [todayStats, setTodayStats] = useState<{ total: TodayStat } | null>(
    null
  );

  const [branches, setBranches] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [packages, setPackages] = useState<
    { id: string; name: string; serviceId: string }[]
  >([]);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [canSelectBranch, setCanSelectBranch] = useState(true);
  const [truncated, setTruncated] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [live, setLive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  }, []);

  // Debounce search -> filters.search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((previous) =>
        previous.search === searchInput.trim()
          ? previous
          : { ...previous, search: searchInput.trim() }
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ----------------------------------------------------------
   * FETCH
   * ---------------------------------------------------------- */

  const fetchAttendance = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const query = new URLSearchParams();

        (Object.keys(filters) as (keyof Filters)[]).forEach((key) => {
          const value = filters[key];
          if (value === "" || value === false) return;
          query.set(key, String(value));
        });

        const res = await fetch(`/api/members/attendance?${query.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Unable to load attendance.");
        }

        setRecords(data.records ?? []);
        setSummary(data.summary ?? null);
        setTodayStats(data.todayStats ?? null);
        setTruncated(Boolean(data.truncated));
        setBranches(data.filters?.branches ?? []);
        setServices(data.filters?.services ?? []);
        setPackages(data.filters?.packages ?? []);
        setSlots(data.filters?.slots ?? []);
        setCanSelectBranch(data.scope?.canSelectBranch ?? true);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load attendance."
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [filters]
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

  const activePreset = presets.find(
    (p) => p.from === filters.from && p.to === filters.to
  );

  /* ----------------------------------------------------------
   * TIME-OF-DAY FILTER (client side)
   * ---------------------------------------------------------- */

  const filtered = useMemo(() => {
    const fromMinutes = clockToMinutes(timeFrom);
    const toMinutes = clockToMinutes(timeTo);

    if (fromMinutes === null && toMinutes === null) return records;

    return records.filter((record) => {
      const minutes = istMinutes(record.checkInAt);

      if (fromMinutes !== null && minutes < fromMinutes) return false;
      if (toMinutes !== null && minutes > toMinutes) return false;

      return true;
    });
  }, [records, timeFrom, timeTo]);

  /* ----------------------------------------------------------
   * DEPENDENT OPTIONS
   * ---------------------------------------------------------- */

  const packageOptions = packages.filter(
    (p) => !filters.serviceId || p.serviceId === filters.serviceId
  );

  const slotOptions = slots.filter(
    (s) =>
      (!filters.branchId || s.branchId === filters.branchId) &&
      (!filters.serviceId || s.serviceId === filters.serviceId)
  );

  /* ----------------------------------------------------------
   * SELECTION
   * ---------------------------------------------------------- */

  const selectedRecords = useMemo(
    () => filtered.filter((record) => selectedIds.has(record.id)),
    [filtered, selectedIds]
  );

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  const toggleOne = (id: string) =>
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (allSelected) {
        filtered.forEach((r) => next.delete(r.id));
      } else {
        filtered.forEach((r) => next.add(r.id));
      }

      return next;
    });

  /* ----------------------------------------------------------
   * FILTER STATE
   * ---------------------------------------------------------- */

  const activeFilterCount =
    [
      filters.search,
      filters.branchId,
      filters.serviceId,
      filters.packageId,
      filters.slotId,
      filters.usageType,
      filters.deducted,
      timeFrom,
      timeTo,
    ].filter(Boolean).length +
    (filters.lowSessions ? 1 : 0) +
    (filters.from !== today || filters.to !== today ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setSearchInput("");
    setFilters(defaultFilters);
    setTimeFrom("");
    setTimeTo("");
    setSelectedIds(new Set());
  };

  // The Today card doubles as a quick tab
  const showToday = () => {
    setFilters((previous) => ({ ...previous, from: today, to: today }));
    setSelectedIds(new Set());
  };

  const viewingToday = filters.from === today && filters.to === today;

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
        Name: r.member.name,
        Contact: r.member.phone,
        Membership: r.subscription.packageName,
        Service: r.subscription.serviceName,
        Slot: r.slot ? slotLabel(r.slot) : "",
        "In Time": formatTime(r.checkInAt),
        Date: formatDay(r.dateKey),
        Branch: r.branch.name,
        "Membership Type":
          r.subscription.usageType === "SESSION_BASED" ? "Session" : "Duration",
        "Session Deducted": r.sessionDeducted ? "Yes" : "No",
        "Sessions Remaining": r.subscription.remainingSessions ?? "",
        "Sessions Total": r.subscription.totalSessions ?? "",
      }));

      const sheet = XLSX.utils.json_to_sheet(excelRows);

      sheet["!cols"] = [
        { wch: 8 },
        { wch: 24 },
        { wch: 16 },
        { wch: 24 },
        { wch: 18 },
        { wch: 28 },
        { wch: 12 },
        { wch: 14 },
        { wch: 20 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 14 },
      ];

      sheet["!autofilter"] = { ref: `A1:M${excelRows.length + 1}` };

      const nameOf = (list: { id: string; name: string }[], id: string) =>
        id ? list.find((item) => item.id === id)?.name || id : "All";

      const slotName = filters.slotId
        ? (() => {
            const slot = slots.find((s) => s.id === filters.slotId);
            return slot ? slotLabel(slot) : filters.slotId;
          })()
        : "All";

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
        ["From", filters.from],
        ["To", filters.to],
        ["Search", filters.search || "All"],
        ["Branch", nameOf(branches, filters.branchId)],
        ["Service", nameOf(services, filters.serviceId)],
        ["Membership", nameOf(packages, filters.packageId)],
        ["Slot", slotName],
        [
          "Membership Type",
          filters.usageType
            ? filters.usageType === "SESSION_BASED"
              ? "Session"
              : "Duration"
            : "All",
        ],
        [
          "Session Deducted",
          filters.deducted ? (filters.deducted === "yes" ? "Yes" : "No") : "All",
        ],
        ["In Time From", timeFrom || "Any"],
        ["In Time To", timeTo || "Any"],
        ["Low sessions only", filters.lowSessions ? "Yes" : "No"],
      ]);

      summarySheet["!cols"] = [{ wch: 25 }, { wch: 35 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Attendance");
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Applied Filters");

      XLSX.writeFile(
        workbook,
        `attendance_${filters.from}_to_${filters.to}.xlsx`,
        { compression: true }
      );

      setSelectedIds(new Set());
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

  const maxDayCount = Math.max(
    ...(summary?.byDay.map((d) => d.count) ?? [1]),
    1
  );
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

      {/* TODAY CARD (also acts as a quick tab) */}

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TodayCard
          title="Total Check-ins Today"
          icon={<UserCheck size={20} />}
          stat={todayStats?.total}
          active={viewingToday}
          onClick={showToday}
        />
      </div>

      {/* CURRENT VIEW SUMMARY */}

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
        <span className="inline-flex items-center gap-2">
          <Clock size={15} className="text-lime-400" />
          Current view:{" "}
          <span className="font-semibold text-white">
            {summary?.totalCheckIns ?? 0}
          </span>{" "}
          check-ins
        </span>

        <span>
          Unique members{" "}
          <span className="font-semibold text-white">
            {summary?.uniqueMembers ?? 0}
          </span>
        </span>

        <span>
          Sessions deducted{" "}
          <span className="font-semibold text-white">
            {summary?.sessionsDeducted ?? 0}
          </span>
        </span>

        <span>
          Busiest slot{" "}
          <span className="font-semibold text-white">
            {summary?.topSlot
              ? `${summary.topSlot.label} · ${summary.topSlot.count}`
              : "-"}
          </span>
        </span>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
            {hasActiveFilters && (
              <span className="rounded-full bg-lime-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                {activeFilterCount}
              </span>
            )}
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
              onClick={() =>
                updateFilters({ from: preset.from, to: preset.to })
              }
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
                value={filters.from}
                max={filters.to}
                onChange={(value) => value && updateFilters({ from: value })}
              />

              <DateFilter
                label="To"
                value={filters.to}
                min={filters.from}
                onChange={(value) => value && updateFilters({ to: value })}
              />

              <TimeFilter
                label="In Time From"
                value={timeFrom}
                onChange={setTimeFrom}
              />

              <TimeFilter
                label="In Time To"
                value={timeTo}
                onChange={setTimeTo}
              />

              {canSelectBranch && (
                <FilterSelect
                  label="Branch"
                  value={filters.branchId}
                  onChange={(value) =>
                    updateFilters({ branchId: value, slotId: "" })
                  }
                  options={[
                    { value: "", label: "All Branches" },
                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                  ]}
                />
              )}

              <FilterSelect
                label="Service"
                value={filters.serviceId}
                onChange={(value) =>
                  updateFilters({
                    serviceId: value,
                    packageId: "",
                    slotId: "",
                  })
                }
                options={[
                  { value: "", label: "All Services" },
                  ...services.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />

              <FilterSelect
                label="Membership"
                value={filters.packageId}
                onChange={(value) => updateFilters({ packageId: value })}
                options={[
                  { value: "", label: "All Memberships" },
                  ...packageOptions.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })),
                ]}
              />

              <FilterSelect
                label="Slot"
                value={filters.slotId}
                onChange={(value) => updateFilters({ slotId: value })}
                options={[
                  { value: "", label: "All Slots" },
                  ...slotOptions.map((s) => ({
                    value: s.id,
                    label:
                      filters.branchId || !canSelectBranch
                        ? slotLabel(s)
                        : `${slotLabel(s)} · ${s.branchName}`,
                  })),
                ]}
              />

              <FilterSelect
                label="Membership Type"
                value={filters.usageType}
                onChange={(value) => updateFilters({ usageType: value })}
                options={[
                  { value: "", label: "All types" },
                  { value: "DURATION_BASED", label: "Duration" },
                  { value: "SESSION_BASED", label: "Session" },
                ]}
              />

              <FilterSelect
                label="Session Deducted"
                value={filters.deducted}
                onChange={(value) => updateFilters({ deducted: value })}
                options={[
                  { value: "", label: "Any" },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
              />

              <label className="flex h-[42px] cursor-pointer items-center gap-2 self-end rounded-lg border border-neutral-800 bg-black px-3 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={filters.lowSessions}
                  onChange={(e) =>
                    updateFilters({ lowSessions: e.target.checked })
                  }
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
          {filters.from === filters.to
            ? ` on ${formatDay(filters.from)}`
            : ` from ${formatDay(filters.from)} to ${formatDay(filters.to)}`}
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
          <table className="w-full min-w-[1150px] text-sm">
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
                <th className="px-4 py-4 text-left">Name</th>
                <th className="px-4 py-4 text-left">Contact</th>
                <th className="px-4 py-4 text-left">Membership</th>
                <th className="px-4 py-4 text-left">Slot</th>
                <th className="px-4 py-4 text-left">In Time</th>
                <th className="px-4 py-4 text-left">Branch</th>
                <th className="px-4 py-4 text-left">Sessions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((record) => {
                const isSelected = selectedIds.has(record.id);
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
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(record.id)}
                        className="h-4 w-4 cursor-pointer accent-lime-400"
                      />
                    </td>

                    {/* Name */}
                    <td className="cursor-pointer px-4 py-4" onClick={go}>
                      <div className="font-medium text-white hover:text-lime-400">
                        {record.member.name}
                      </div>
                    </td>

                    {/* Contact */}
                    <td
                      className="cursor-pointer px-4 py-4 text-neutral-300"
                      onClick={go}
                    >
                      {record.member.phone}
                    </td>

                    {/* Membership */}
                    <td className="cursor-pointer px-4 py-4" onClick={go}>
                      <div className="text-neutral-200">{sub.packageName}</div>

                      <div className="mt-0.5 text-xs text-neutral-500">
                        {sub.serviceName}
                      </div>
                    </td>

                    {/* Slot */}
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

                    {/* In time */}
                    <td className="cursor-pointer px-4 py-4" onClick={go}>
                      <div className="font-medium text-white">
                        {formatTime(record.checkInAt)}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {formatDay(record.dateKey)}
                      </div>
                    </td>

                    {/* Branch */}
                    <td
                      className="cursor-pointer px-4 py-4 text-neutral-400"
                      onClick={go}
                    >
                      {record.branch.name}
                    </td>

                    {/* Sessions */}
                    <td className="cursor-pointer px-4 py-4" onClick={go}>
                      {isSession ? (
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                              low
                                ? "bg-red-500/20 text-red-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {remaining ?? 0} / {sub.totalSessions ?? "-"} left
                          </span>

                          {record.sessionDeducted && (
                            <p className="mt-1 text-[11px] text-neutral-500">
                              1 session deducted
                            </p>
                          )}
                        </div>
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

            <p className="text-sm font-medium text-white">No check-ins found</p>

            <p className="mt-1 text-xs text-neutral-500">
              Try another date range or change your filters.
            </p>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 text-sm text-neutral-500">
          Loading attendance...
        </div>
      )}
    </div>
  );
};

export default Page;

/* ============================================================
 * SMALL COMPONENTS
 * ============================================================ */

const TodayCard = ({
  title,
  icon,
  stat,
  active,
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  stat?: TodayStat;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-2xl border p-5 text-left transition ${
      active
        ? "border-lime-400/60 bg-lime-400/5"
        : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-sm ${active ? "text-lime-400" : "text-neutral-400"}`}>
          {title}
        </p>

        <p className="mt-2 text-3xl font-bold text-white">{stat?.count ?? 0}</p>

        <p className="mt-1 text-xs text-neutral-500">
          {stat?.uniqueMembers ?? 0} unique member
          {stat?.uniqueMembers === 1 ? "" : "s"} · click to view
        </p>
      </div>

      <div className="rounded-lg bg-black/40 p-3 text-lime-400">{icon}</div>
    </div>
  </button>
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
      style={{ colorScheme: "dark" }}
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

const TimeFilter = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-neutral-500">
      {label}
    </label>

    <div className="relative">
      <Clock
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
      />

      <input
        type="time"
        value={value}
        style={{ colorScheme: "dark" }}
        onChange={(e) => onChange(e.target.value)}
        className="h-[42px] w-full rounded-lg border border-neutral-800 bg-black pl-9 pr-3 text-sm text-white outline-none focus:border-lime-400/50"
      />
    </div>
  </div>
);