"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCcw,
  Search,
  UserPlus,
  X,
} from "lucide-react";

import { MemberModal } from "./MemberModal";

type Mode = "active" | "inactive";

type MemberRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dob: string | null;
  gender: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  emergencyContact: string | null;
  address: string | null;
  referralCode: string | null;
  status: string;
  onBoardCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  branchId: string | null;
  coachId: string | null;
  branch?: { id: string; name: string } | null;
  coach?: { id: string; name: string } | null;

  currentStatus: string;
  membershipName: string | null;
  serviceName: string | null;
  startDate: string | null;
  endDate: string | null;
  renewalCount: number;
  membershipCount: number;
};

const STATUS_OPTIONS = ["ALL", "ACTIVE", "EXPIRED", "FROZEN", "CANCELLED", "NONE"];
const GENDER_OPTIONS = ["ALL", "MALE", "FEMALE", "OTHER"];
const ONBOARDING_OPTIONS = ["ALL", "COMPLETED", "PENDING"];

const PAGE_SIZE = 25;
const IST = "Asia/Kolkata";

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400",
  EXPIRED: "bg-red-500/20 text-red-400",
  FROZEN: "bg-blue-500/20 text-blue-400",
  CANCELLED: "bg-yellow-500/20 text-yellow-400",
  NONE: "bg-neutral-700 text-neutral-400",
};

/** "YYYY-MM-DD" in IST, so filters match what staff see. */
const dateKey = (value: string | null | undefined) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-CA", { timeZone: IST });
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", { timeZone: IST });
};

export default function MembersList({ mode }: { mode: Mode }) {
  const router = useRouter();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [branchId, setBranchId] = useState("ALL");
  const [gender, setGender] = useState("ALL");
  const [onboarding, setOnboarding] = useState("ALL");
  const [coachId, setCoachId] = useState("ALL");
  const [membership, setMembership] = useState("ALL");

  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [endFrom, setEndFrom] = useState("");
  const [endTo, setEndTo] = useState("");

  const [minRenewals, setMinRenewals] = useState("");
  const [maxRenewals, setMaxRenewals] = useState("");

  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const fetchMembers = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/members/${mode}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to fetch members");
      }

      setMembers(data.members || []);
    } catch (err) {
      console.error("Failed to fetch members:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* ---------------- FILTER OPTIONS (built from the data) ---------------- */

  const options = useMemo(() => {
    const branches = new Map<string, string>();
    const coaches = new Map<string, string>();
    const memberships = new Set<string>();

    for (const m of members) {
      if (m.branch) branches.set(m.branch.id, m.branch.name);
      if (m.coach) coaches.set(m.coach.id, m.coach.name);
      if (m.membershipName) memberships.add(m.membershipName);
    }

    const byName = (a: [string, string], b: [string, string]) =>
      a[1].localeCompare(b[1]);

    return {
      branches: Array.from(branches.entries()).sort(byName),
      coaches: Array.from(coaches.entries()).sort(byName),
      memberships: Array.from(memberships).sort((a, b) => a.localeCompare(b)),
    };
  }, [members]);

  /* ---------------- FILTERING ---------------- */

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = minRenewals === "" ? null : Number(minRenewals);
    const max = maxRenewals === "" ? null : Number(maxRenewals);

    return members.filter((m) => {
      if (query) {
        const haystack = [m.name, m.phone, m.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      if (status !== "ALL" && m.currentStatus !== status) return false;
      if (branchId !== "ALL" && m.branchId !== branchId) return false;
      if (gender !== "ALL" && m.gender?.toUpperCase() !== gender) return false;
      if (coachId !== "ALL" && m.coachId !== coachId) return false;
      if (membership !== "ALL" && m.membershipName !== membership) return false;

      if (onboarding === "COMPLETED" && !m.onBoardCompleted) return false;
      if (onboarding === "PENDING" && m.onBoardCompleted) return false;

      const joined = dateKey(m.createdAt);
      if (joinedFrom && (!joined || joined < joinedFrom)) return false;
      if (joinedTo && (!joined || joined > joinedTo)) return false;

      const start = dateKey(m.startDate);
      if (startFrom && (!start || start < startFrom)) return false;
      if (startTo && (!start || start > startTo)) return false;

      const end = dateKey(m.endDate);
      if (endFrom && (!end || end < endFrom)) return false;
      if (endTo && (!end || end > endTo)) return false;

      if (min !== null && Number.isFinite(min) && m.renewalCount < min) {
        return false;
      }

      if (max !== null && Number.isFinite(max) && m.renewalCount > max) {
        return false;
      }

      return true;
    });
  }, [
    members,
    search,
    status,
    branchId,
    gender,
    onboarding,
    coachId,
    membership,
    joinedFrom,
    joinedTo,
    startFrom,
    startTo,
    endFrom,
    endTo,
    minRenewals,
    maxRenewals,
  ]);

  // back to page 1 whenever the result set changes
  useEffect(() => {
    setPage(1);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /* ---------------- SELECTION ---------------- */

  const selectedMembers = useMemo(() => {
    const set = new Set(selectedIds);
    return filtered.filter((m) => set.has(m.id));
  }, [filtered, selectedIds]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((m) => selectedIds.includes(m.id));

  const toggleMember = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const ids = new Set(filtered.map((m) => m.id));
      setSelectedIds((current) => current.filter((id) => !ids.has(id)));
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      filtered.forEach((m) => next.add(m.id));
      return Array.from(next);
    });
  };

  /* ---------------- CLEAR ---------------- */

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setBranchId("ALL");
    setGender("ALL");
    setOnboarding("ALL");
    setCoachId("ALL");
    setMembership("ALL");
    setJoinedFrom("");
    setJoinedTo("");
    setStartFrom("");
    setStartTo("");
    setEndFrom("");
    setEndTo("");
    setMinRenewals("");
    setMaxRenewals("");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "ALL" ||
    branchId !== "ALL" ||
    gender !== "ALL" ||
    onboarding !== "ALL" ||
    coachId !== "ALL" ||
    membership !== "ALL" ||
    joinedFrom !== "" ||
    joinedTo !== "" ||
    startFrom !== "" ||
    startTo !== "" ||
    endFrom !== "" ||
    endTo !== "" ||
    minRenewals !== "" ||
    maxRenewals !== "";

  /* ---------------- EXPORT ---------------- */

  const exportToExcel = () => {
    const rows = selectedMembers.length > 0 ? selectedMembers : filtered;

    if (rows.length === 0) {
      window.alert("There are no members to export.");
      return;
    }

    setExporting(true);

    try {
      const excelRows = rows.map((m, index) => ({
        "S.No": index + 1,
        "Member ID": m.id,
        Name: m.name,
        Phone: m.phone,
        Email: m.email || "",
        "Date of Birth": m.dob || "",
        Gender: m.gender || "",
        Age: m.age ?? "",
        Weight: m.weight ?? "",
        Height: m.height ?? "",
        Branch: m.branch?.name || "",
        Coach: m.coach?.name || "",
        Service: m.serviceName || "",
        Membership: m.membershipName || "",
        "Start Date": formatDate(m.startDate),
        "End Date": formatDate(m.endDate),
        "Renewal Count": m.renewalCount,
        Status: m.currentStatus || "",
        "Member Status": m.status || "",
        Onboarding: m.onBoardCompleted ? "Completed" : "Pending",
        "Emergency Contact": m.emergencyContact || "",
        Address: m.address || "",
        "Referral Code": m.referralCode || "",
        "Joined Date": formatDate(m.createdAt),
        "Updated Date": formatDate(m.updatedAt),
      }));

      const membersSheet = XLSX.utils.json_to_sheet(excelRows);

      if (membersSheet["!ref"]) {
        membersSheet["!autofilter"] = { ref: membersSheet["!ref"] };
      }

      const branchName =
        branchId === "ALL"
          ? "All branches"
          : options.branches.find(([id]) => id === branchId)?.[1] || branchId;

      const coachName =
        coachId === "ALL"
          ? "All coaches"
          : options.coaches.find(([id]) => id === coachId)?.[1] || coachId;

      const filterSheet = XLSX.utils.aoa_to_sheet([
        [mode === "active" ? "Active Members Export" : "Inactive Members Export"],
        [],
        ["Exported At", new Date().toLocaleString("en-IN")],
        ["Records Exported", rows.length],
        [
          "Export Type",
          selectedMembers.length > 0
            ? "Selected members"
            : "All filtered members",
        ],
        [],
        ["Applied Filters", "Value"],
        ["Search", search || "All"],
        ["Status", status],
        ["Branch", branchName],
        ["Membership", membership === "ALL" ? "All" : membership],
        ["Gender", gender],
        ["Onboarding", onboarding],
        ["Coach", coachName],
        ["Joined From", joinedFrom || "All"],
        ["Joined To", joinedTo || "All"],
        ["Start Date From", startFrom || "All"],
        ["Start Date To", startTo || "All"],
        ["End Date From", endFrom || "All"],
        ["End Date To", endTo || "All"],
        ["Min Renewals", minRenewals || "Any"],
        ["Max Renewals", maxRenewals || "Any"],
      ]);

      filterSheet["!cols"] = [{ wch: 25 }, { wch: 35 }];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, membersSheet, "Members");
      XLSX.utils.book_append_sheet(workbook, filterSheet, "Applied Filters");

      const now = new Date();
      const datePart = now.toISOString().slice(0, 10);
      const timePart = now.toTimeString().slice(0, 8).replace(/:/g, "-");

      XLSX.writeFile(
        workbook,
        `${mode}_members_${datePart}_${timePart}.xlsx`,
        { compression: true }
      );

      setSelectedIds([]);
    } catch (err) {
      console.error("Excel export failed:", err);
      window.alert("Failed to export members.");
    } finally {
      setExporting(false);
    }
  };

  const openMember = (id: string) => router.push(`/dashboard/members/${id}`);

  const headings = [
    "Name",
    "Phone",
    "DOB",
    "Branch",
    "Coach",
    "Membership",
    "Start Date",
    "End Date",
    "Renewals",
    "Joined",
    "Onboarding",
    "Status",
  ];

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {mode === "active" ? "Active Members" : "Inactive Members"}
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            {mode === "active"
              ? "Members with a running membership"
              : "Members whose membership has expired, is frozen or cancelled, or who have none"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchMembers}
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
              : selectedMembers.length > 0
              ? `Export ${selectedMembers.length}`
              : `Export ${filtered.length}`}
          </button>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
          >
            <UserPlus size={16} />
            Add Member
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
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
              placeholder="Search by name, phone or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-black py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-400/50"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
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
              className={`transition-transform ${
                showFilters ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 border-t border-neutral-800 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect
                label="Status"
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS.map((value) => ({
                  value,
                  label:
                    value === "ALL"
                      ? "All Statuses"
                      : value === "NONE"
                      ? "No Membership"
                      : value,
                }))}
              />

              <FilterSelect
                label="Branch"
                value={branchId}
                onChange={setBranchId}
                options={[
                  { value: "ALL", label: "All Branches" },
                  ...options.branches.map(([id, name]) => ({
                    value: id,
                    label: name,
                  })),
                ]}
              />

              <FilterSelect
                label="Membership"
                value={membership}
                onChange={setMembership}
                options={[
                  { value: "ALL", label: "All Memberships" },
                  ...options.memberships.map((name) => ({
                    value: name,
                    label: name,
                  })),
                ]}
              />

              <FilterSelect
                label="Coach"
                value={coachId}
                onChange={setCoachId}
                options={[
                  { value: "ALL", label: "All Coaches" },
                  ...options.coaches.map(([id, name]) => ({
                    value: id,
                    label: name,
                  })),
                ]}
              />

              <FilterSelect
                label="Gender"
                value={gender}
                onChange={setGender}
                options={GENDER_OPTIONS.map((value) => ({
                  value,
                  label: value === "ALL" ? "All Genders" : value,
                }))}
              />

              <FilterSelect
                label="Onboarding"
                value={onboarding}
                onChange={setOnboarding}
                options={ONBOARDING_OPTIONS.map((value) => ({
                  value,
                  label:
                    value === "ALL"
                      ? "All Members"
                      : value === "COMPLETED"
                      ? "Completed"
                      : "Pending",
                }))}
              />

              <NumberFilter
                label="Min Renewals"
                value={minRenewals}
                onChange={setMinRenewals}
                placeholder="0"
              />

              <NumberFilter
                label="Max Renewals"
                value={maxRenewals}
                onChange={setMaxRenewals}
                placeholder="Any"
              />

              <DateFilter
                label="Start Date From"
                value={startFrom}
                onChange={setStartFrom}
              />

              <DateFilter
                label="Start Date To"
                value={startTo}
                onChange={setStartTo}
              />

              <DateFilter
                label="End Date From"
                value={endFrom}
                onChange={setEndFrom}
              />

              <DateFilter
                label="End Date To"
                value={endTo}
                onChange={setEndTo}
              />

              <DateFilter
                label="Joined From"
                value={joinedFrom}
                onChange={setJoinedFrom}
              />

              <DateFilter
                label="Joined To"
                value={joinedTo}
                onChange={setJoinedTo}
              />

              <div className="flex items-end sm:col-span-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-black px-4 text-sm font-medium text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X size={15} />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUMMARY */}

      <div className="mb-4 flex flex-col gap-2 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing{" "}
          <span className="font-semibold text-white">{filtered.length}</span> of{" "}
          <span className="font-semibold text-white">{members.length}</span>{" "}
          members
        </div>

        {selectedMembers.length > 0 && (
          <div className="text-lime-300">
            {selectedMembers.length} member
            {selectedMembers.length !== 1 ? "s" : ""} selected
          </div>
        )}
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="w-12 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    disabled={filtered.length === 0}
                    className="h-4 w-4 cursor-pointer accent-lime-400"
                  />
                </th>

                {headings.map((heading) => (
                  <th key={heading} className="px-4 py-4 text-left">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pageRows.map((m) => {
                const isSelected = selectedIds.includes(m.id);

                const cell = "cursor-pointer px-4 py-4";

                return (
                  <tr
                    key={m.id}
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
                        onChange={() => toggleMember(m.id)}
                        className="h-4 w-4 cursor-pointer accent-lime-400"
                      />
                    </td>

                    <td className={cell} onClick={() => openMember(m.id)}>
                      <div className="font-medium text-white">{m.name}</div>

                      {m.gender && (
                        <div className="mt-0.5 text-xs text-neutral-600">
                          {m.gender}
                        </div>
                      )}
                    </td>

                    <td
                      className={`${cell} text-neutral-300`}
                      onClick={() => openMember(m.id)}
                    >
                      {m.phone}
                    </td>

                    <td
                      className={`${cell} text-neutral-400`}
                      onClick={() => openMember(m.id)}
                    >
                      {formatDate(m.dob)}
                    </td>

                    <td
                      className={`${cell} text-neutral-400`}
                      onClick={() => openMember(m.id)}
                    >
                      {m.branch?.name || "-"}
                    </td>

                    <td
                      className={`${cell} text-neutral-400`}
                      onClick={() => openMember(m.id)}
                    >
                      {m.coach?.name || "-"}
                    </td>

                    <td className={cell} onClick={() => openMember(m.id)}>
                      <div className="text-neutral-200">
                        {m.membershipName || "-"}
                      </div>

                      {m.serviceName && (
                        <div className="mt-0.5 text-xs text-neutral-600">
                          {m.serviceName}
                        </div>
                      )}
                    </td>

                    <td
                      className={`${cell} whitespace-nowrap text-neutral-300`}
                      onClick={() => openMember(m.id)}
                    >
                      {formatDate(m.startDate)}
                    </td>

                    <td
                      className={`${cell} whitespace-nowrap text-neutral-300`}
                      onClick={() => openMember(m.id)}
                    >
                      {formatDate(m.endDate)}
                    </td>

                    <td className={cell} onClick={() => openMember(m.id)}>
                      <span className="rounded-md bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-300">
                        {m.renewalCount}
                      </span>
                    </td>

                    <td
                      className={`${cell} text-xs text-neutral-500`}
                      onClick={() => openMember(m.id)}
                    >
                      {formatDate(m.createdAt)}
                    </td>

                    <td className={cell} onClick={() => openMember(m.id)}>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                          m.onBoardCompleted
                            ? "bg-green-500/20 text-green-400"
                            : "bg-orange-500/20 text-orange-400"
                        }`}
                      >
                        {m.onBoardCompleted && <Check size={12} />}
                        {m.onBoardCompleted ? "Completed" : "Pending"}
                      </span>
                    </td>

                    <td className={cell} onClick={() => openMember(m.id)}>
                      <span
                        className={`rounded-md px-2 py-1 text-xs ${
                          statusStyles[m.currentStatus] || statusStyles.NONE
                        }`}
                      >
                        {m.currentStatus}
                      </span>
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

            <p className="text-sm font-medium text-white">No members found</p>

            <p className="mt-1 text-xs text-neutral-500">
              Try changing your search or filters.
            </p>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-4">
            <p className="text-xs text-neutral-600">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} –{" "}
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition hover:border-lime-400/40 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={15} />
              </button>

              <span className="min-w-16 text-center text-xs text-neutral-500">
                Page {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition hover:border-lime-400/40 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 text-sm text-neutral-500">Loading members...</div>
      )}

      {open && (
        <MemberModal
          open={open}
          setOpen={setOpen}
          onSuccess={() => {
            window.alert("Member created successfully");
            setOpen(false);
            fetchMembers();
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   FILTER INPUTS
   ============================================================ */

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
      onChange={(event) => onChange(event.target.value)}
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

const NumberFilter = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-neutral-500">
      {label}
    </label>

    <input
      type="number"
      min="0"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-[42px] w-full rounded-lg border border-neutral-800 bg-black px-3 text-sm text-white outline-none focus:border-lime-400/50"
    />
  </div>
);

const DateFilter = ({
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
      <Calendar
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
      />

      <input
        type="date"
        style={{ colorScheme: "dark" }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[42px] w-full rounded-lg border border-neutral-800 bg-black pl-9 pr-3 text-sm text-white outline-none focus:border-lime-400/50"
      />
    </div>
  </div>
);