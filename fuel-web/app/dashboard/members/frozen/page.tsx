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
import { MemberModal } from "../MemberModal";

type FrozenMember = {
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

  currentStatus: "FROZEN";
  membershipName: string | null;
  serviceName: string | null;
  freezeStart: string | null;
  freezeEnd: string | null;
  endDate: string | null;
  frozenCount: number;
  frozenSubscription: {
    id: string;
    packageId: string | null;
    status: string;
    endDate: string | null;
  } | null;
};

const PAGE_SIZE = 25;
const IST = "Asia/Kolkata";

/** "YYYY-MM-DD" in IST so date filters match what staff see. */
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

const inputClass =
  "w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400";

const labelClass = "mb-1.5 block text-xs font-medium text-neutral-500";

const FrozenMembers = () => {
  const router = useRouter();

  const [members, setMembers] = useState<FrozenMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [branchFilter, setBranchFilter] = useState("");
  const [coachFilter, setCoachFilter] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [onboardingFilter, setOnboardingFilter] = useState("");

  const [freezeStartFrom, setFreezeStartFrom] = useState("");
  const [freezeStartTo, setFreezeStartTo] = useState("");
  const [freezeEndFrom, setFreezeEndFrom] = useState("");
  const [freezeEndTo, setFreezeEndTo] = useState("");
  const [endFrom, setEndFrom] = useState("");
  const [endTo, setEndTo] = useState("");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  /* ---------------- FETCH ---------------- */

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/members/frozen", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to fetch frozen members");
      }

      setMembers(data.members ?? []);
    } catch (err) {
      console.error("Failed to fetch frozen members:", err);

      setError(
        err instanceof Error ? err.message : "Failed to fetch frozen members"
      );

      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  /* ---------------- FILTER OPTIONS (built from the data) ---------------- */

  const options = useMemo(() => {
    const branches = new Map<string, string>();
    const coaches = new Map<string, string>();
    const memberships = new Set<string>();
    const services = new Set<string>();

    for (const m of members) {
      if (m.branch) branches.set(m.branch.id, m.branch.name);
      if (m.coach) coaches.set(m.coach.id, m.coach.name);
      if (m.membershipName) memberships.add(m.membershipName);
      if (m.serviceName) services.add(m.serviceName);
    }

    const byName = (a: [string, string], b: [string, string]) =>
      a[1].localeCompare(b[1]);

    const sortText = (a: string, b: string) => a.localeCompare(b);

    return {
      branches: Array.from(branches.entries()).sort(byName),
      coaches: Array.from(coaches.entries()).sort(byName),
      memberships: Array.from(memberships).sort(sortText),
      services: Array.from(services).sort(sortText),
    };
  }, [members]);

  /* ---------------- FILTERING ---------------- */

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    const inRange = (
      value: string | null | undefined,
      from: string,
      to: string
    ) => {
      if (!from && !to) return true;

      const key = dateKey(value);

      if (!key) return false;
      if (from && key < from) return false;
      if (to && key > to) return false;

      return true;
    };

    return members.filter((m) => {
      if (query) {
        const haystack = [m.name, m.phone, m.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      if (branchFilter && m.branchId !== branchFilter) return false;
      if (coachFilter && m.coachId !== coachFilter) return false;
      if (membershipFilter && m.membershipName !== membershipFilter) {
        return false;
      }
      if (serviceFilter && m.serviceName !== serviceFilter) return false;

      if (
        genderFilter &&
        String(m.gender ?? "").toLowerCase() !== genderFilter.toLowerCase()
      ) {
        return false;
      }

      if (onboardingFilter === "COMPLETED" && !m.onBoardCompleted) {
        return false;
      }
      if (onboardingFilter === "PENDING" && m.onBoardCompleted) return false;

      return (
        inRange(m.freezeStart, freezeStartFrom, freezeStartTo) &&
        inRange(m.freezeEnd, freezeEndFrom, freezeEndTo) &&
        inRange(m.endDate, endFrom, endTo) &&
        inRange(m.createdAt, joinedFrom, joinedTo)
      );
    });
  }, [
    members,
    search,
    branchFilter,
    coachFilter,
    membershipFilter,
    serviceFilter,
    genderFilter,
    onboardingFilter,
    freezeStartFrom,
    freezeStartTo,
    freezeEndFrom,
    freezeEndTo,
    endFrom,
    endTo,
    joinedFrom,
    joinedTo,
  ]);

  // back to page 1 whenever the result set changes
  useEffect(() => {
    setPage(1);
  }, [filteredMembers]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageRows = filteredMembers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /* ---------------- SELECTION ---------------- */

  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((m) => selectedIds.includes(m.id));

  const toggleMember = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !filteredMembers.some((m) => m.id === id))
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([...current, ...filteredMembers.map((m) => m.id)]),
      ]);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setBranchFilter("");
    setCoachFilter("");
    setMembershipFilter("");
    setServiceFilter("");
    setGenderFilter("");
    setOnboardingFilter("");
    setFreezeStartFrom("");
    setFreezeStartTo("");
    setFreezeEndFrom("");
    setFreezeEndTo("");
    setEndFrom("");
    setEndTo("");
    setJoinedFrom("");
    setJoinedTo("");
  };

  const hasFilters = Boolean(
    search ||
      branchFilter ||
      coachFilter ||
      membershipFilter ||
      serviceFilter ||
      genderFilter ||
      onboardingFilter ||
      freezeStartFrom ||
      freezeStartTo ||
      freezeEndFrom ||
      freezeEndTo ||
      endFrom ||
      endTo ||
      joinedFrom ||
      joinedTo
  );

  /* ---------------- EXPORT ---------------- */

  const exportMembers = (onlySelected: boolean) => {
    const exportData = onlySelected
      ? filteredMembers.filter((m) => selectedIds.includes(m.id))
      : filteredMembers;

    if (!exportData.length) return;

    const rows = exportData.map((m, index) => ({
      "S.No": index + 1,
      "Member ID": m.id,
      Name: m.name,
      Phone: m.phone,
      Email: m.email ?? "",
      DOB: formatDate(m.dob) === "-" ? "" : formatDate(m.dob),
      Gender: m.gender ?? "",
      Age: m.age ?? "",
      Weight: m.weight ?? "",
      Height: m.height ?? "",
      Branch: m.branch?.name ?? "",
      Coach: m.coach?.name ?? "",
      Service: m.serviceName ?? "",
      Membership: m.membershipName ?? "",
      "Freeze Start Date": formatDate(m.freezeStart),
      "Freeze End Date": formatDate(m.freezeEnd),
      "Membership End Date": formatDate(m.endDate),
      "Frozen Memberships": m.frozenCount,
      "Member Status": m.status ?? "",
      "Subscription Status": "FROZEN",
      "Subscription ID": m.frozenSubscription?.id ?? "",
      Onboarding: m.onBoardCompleted ? "COMPLETED" : "PENDING",
      "Emergency Contact": m.emergencyContact ?? "",
      Address: m.address ?? "",
      "Referral Code": m.referralCode ?? "",
      "Joined Date": formatDate(m.createdAt),
      "Updated Date": formatDate(m.updatedAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const filterSummary = [
      { Filter: "Search", Value: search || "All" },
      {
        Filter: "Branch",
        Value:
          options.branches.find(([id]) => id === branchFilter)?.[1] || "All",
      },
      {
        Filter: "Coach",
        Value:
          options.coaches.find(([id]) => id === coachFilter)?.[1] || "All",
      },
      { Filter: "Membership", Value: membershipFilter || "All" },
      { Filter: "Service", Value: serviceFilter || "All" },
      { Filter: "Gender", Value: genderFilter || "All" },
      { Filter: "Onboarding", Value: onboardingFilter || "All" },
      { Filter: "Freeze Start From", Value: freezeStartFrom || "All" },
      { Filter: "Freeze Start To", Value: freezeStartTo || "All" },
      { Filter: "Freeze End From", Value: freezeEndFrom || "All" },
      { Filter: "Freeze End To", Value: freezeEndTo || "All" },
      { Filter: "Membership End From", Value: endFrom || "All" },
      { Filter: "Membership End To", Value: endTo || "All" },
      { Filter: "Joined From", Value: joinedFrom || "All" },
      { Filter: "Joined To", Value: joinedTo || "All" },
      { Filter: "Subscription Status", Value: "FROZEN" },
      {
        Filter: "Export Type",
        Value: onlySelected ? "Selected Members" : "All Filtered Members",
      },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Frozen Members");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(filterSummary),
      "Filters"
    );

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");

    XLSX.writeFile(workbook, `frozen_members_${date}_${time}.xlsx`);
  };

  const openMember = (id: string) => router.push(`/dashboard/members/${id}`);

  const headings = [
    "Name",
    "Phone",
    "DOB",
    "Branch",
    "Coach",
    "Membership",
    "Freeze Start",
    "Freeze End",
    "Membership End",
    "Onboarding",
    "Status",
  ];

  const dateFilters = [
    ["Freeze Start From", freezeStartFrom, setFreezeStartFrom],
    ["Freeze Start To", freezeStartTo, setFreezeStartTo],
    ["Freeze End From", freezeEndFrom, setFreezeEndFrom],
    ["Freeze End To", freezeEndTo, setFreezeEndTo],
    ["Membership End From", endFrom, setEndFrom],
    ["Membership End To", endTo, setEndTo],
    ["Joined From", joinedFrom, setJoinedFrom],
    ["Joined To", joinedTo, setJoinedTo],
  ] as const;

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="border-b border-neutral-800 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">Frozen Members</h1>

                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                  {members.length}
                </span>
              </div>

              <p className="mt-1 text-sm text-neutral-500">
                Members with frozen subscriptions
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchMembers}
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>

              <button
                onClick={() => setShowFilters((value) => !value)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                  showFilters || hasFilters
                    ? "border-lime-400 bg-lime-400/10 text-lime-400"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700"
                }`}
              >
                <Filter size={16} />
                Filters
              </button>

              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-medium text-black transition hover:bg-lime-300"
              >
                <UserPlus size={16} />
                Add Member
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="border-b border-neutral-800 px-6 py-4">
          <div className="relative max-w-xl">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or email..."
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-b border-neutral-800 bg-neutral-950 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass}>Branch</label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All Branches</option>
                  {options.branches.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Membership</label>
                <select
                  value={membershipFilter}
                  onChange={(e) => setMembershipFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All Memberships</option>
                  {options.memberships.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Service</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All Services</option>
                  {options.services.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Coach</label>
                <select
                  value={coachFilter}
                  onChange={(e) => setCoachFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All Coaches</option>
                  {options.coaches.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Gender</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Onboarding</label>
                <select
                  value={onboardingFilter}
                  onChange={(e) => setOnboardingFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>

              {dateFilters.map(([label, value, setter]) => (
                <div key={label}>
                  <label className={labelClass}>{label}</label>

                  <div className="relative">
                    <Calendar
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                    />

                    <input
                      type="date"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-lg border border-neutral-800 bg-black py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400"
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-800 px-3 py-2.5 text-sm text-neutral-400 transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-800 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm text-neutral-400">
            <span>
              Showing{" "}
              <span className="font-medium text-white">
                {filteredMembers.length}
              </span>{" "}
              frozen members
            </span>

            {selectedIds.length > 0 && (
              <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-400">
                {selectedIds.length} selected
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportMembers(false)}
              disabled={!filteredMembers.length}
              className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={15} />
              Export All
            </button>

            <button
              onClick={() => exportMembers(true)}
              disabled={!selectedIds.length}
              className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={15} />
              Export Selected
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px]">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950 text-left">
                <th className="w-12 px-6 py-3">
                  <button
                    onClick={toggleAllFiltered}
                    className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                      allFilteredSelected
                        ? "border-lime-400 bg-lime-400 text-black"
                        : "border-neutral-700 bg-transparent"
                    }`}
                  >
                    {allFilteredSelected && <Check size={12} strokeWidth={3} />}
                  </button>
                </th>

                {headings.map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500"
                  >
                    {heading}
                  </th>
                ))}

                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center">
                    <div className="flex items-center justify-center gap-3 text-sm text-neutral-500">
                      <RefreshCcw size={16} className="animate-spin" />
                      Loading frozen members...
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900">
                        <Filter size={20} className="text-neutral-600" />
                      </div>

                      <p className="text-sm font-medium text-neutral-300">
                        No frozen members found
                      </p>

                      <p className="mt-1 text-xs text-neutral-600">
                        Try changing your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((m) => {
                  const selected = selectedIds.includes(m.id);

                  const cell = "cursor-pointer px-4 py-4";

                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-neutral-900 transition hover:bg-neutral-950 ${
                        selected ? "bg-neutral-950" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleMember(m.id)}
                          className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                            selected
                              ? "border-lime-400 bg-lime-400 text-black"
                              : "border-neutral-700 bg-transparent"
                          }`}
                        >
                          {selected && <Check size={12} strokeWidth={3} />}
                        </button>
                      </td>

                      <td className={cell} onClick={() => openMember(m.id)}>
                        <div className="font-medium text-white hover:text-lime-400">
                          {m.name}
                        </div>

                        <div className="mt-0.5 text-xs text-neutral-600">
                          {m.email || "No email"}
                        </div>
                      </td>

                      <td
                        className={`${cell} text-sm text-neutral-300`}
                        onClick={() => openMember(m.id)}
                      >
                        {m.phone}
                      </td>

                      <td
                        className={`${cell} text-sm text-neutral-400`}
                        onClick={() => openMember(m.id)}
                      >
                        {formatDate(m.dob)}
                      </td>

                      <td
                        className={`${cell} text-sm text-neutral-300`}
                        onClick={() => openMember(m.id)}
                      >
                        {m.branch?.name || "-"}
                      </td>

                      <td
                        className={`${cell} text-sm text-neutral-300`}
                        onClick={() => openMember(m.id)}
                      >
                        {m.coach?.name || "-"}
                      </td>

                      <td className={cell} onClick={() => openMember(m.id)}>
                        <div className="text-sm text-neutral-200">
                          {m.membershipName || "-"}
                        </div>

                        {m.serviceName && (
                          <div className="mt-0.5 text-xs text-neutral-600">
                            {m.serviceName}
                          </div>
                        )}
                      </td>

                      <td
                        className={`${cell} whitespace-nowrap text-sm text-blue-300`}
                        onClick={() => openMember(m.id)}
                      >
                        {formatDate(m.freezeStart)}
                      </td>

                      <td
                        className={`${cell} whitespace-nowrap text-sm text-blue-300`}
                        onClick={() => openMember(m.id)}
                      >
                        {formatDate(m.freezeEnd)}
                      </td>

                      <td
                        className={`${cell} whitespace-nowrap text-sm text-neutral-400`}
                        onClick={() => openMember(m.id)}
                      >
                        {formatDate(m.endDate)}
                      </td>

                      <td className={cell} onClick={() => openMember(m.id)}>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            m.onBoardCompleted
                              ? "bg-lime-400/10 text-lime-400"
                              : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {m.onBoardCompleted ? "COMPLETED" : "PENDING"}
                        </span>
                      </td>

                      <td className={cell} onClick={() => openMember(m.id)}>
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                          FROZEN
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={() => openMember(m.id)}
                          className="text-neutral-600 transition hover:text-white"
                        >
                          <ChevronDown size={16} className="-rotate-90" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-800 px-6 py-4">
            <p className="text-xs text-neutral-600">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} –{" "}
              {Math.min(currentPage * PAGE_SIZE, filteredMembers.length)} of{" "}
              {filteredMembers.length}
            </p>

            <div className="flex items-center gap-2">
              <button
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

      <MemberModal open={open} setOpen={setOpen} onSuccess={fetchMembers} />
    </>
  );
};

export default FrozenMembers;