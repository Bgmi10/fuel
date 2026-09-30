"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

import {
  Calendar,
  Check,
  ChevronDown,
  Download,
  Filter,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";

type Membership = {
  id: string;

  status: string;

  serviceName: string | null;
  packageName: string | null;

  packageDurationInDays: number | null;

  usageType: string | null;

  totalSessions: number | null;
  remainingSessions: number | null;
  usedSessions: number | null;

  startDate: string | null;
  endDate: string | null;

  originalPrice: number | null;
  finalPrice: number | null;

  branchName: string | null;

  createdAt: string;
  updatedAt: string;

  member: {
    id: string;

    name: string;
    phone: string;
    email: string | null;

    profileImage: string | null;

    gender: string | null;
    age: number | null;
    weight: number | null;
    height: number | null;

    emergencyContact: string | null;
    address: string | null;
    referralCode: string | null;

    status: string;
    onBoardCompleted: boolean;

    branch: {
      id: string;
      name: string;
    } | null;

    coach: {
      id: string;
      name: string;
    } | null;
  } | null;
};

type Branch = {
  id: string;
  name: string;
};

type Coach = {
  id: string;
  name: string;
};

const STATUS_OPTIONS = [
  "ACTIVE",
  "FROZEN",
  "EXPIRED",
  "CANCELLED",
  "TRANSFERRED",
];

export default function MembershipsPage() {
  const router = useRouter();

  const [memberships, setMemberships] = useState<
    Membership[]
  >([]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);

  const [loading, setLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [coachFilter, setCoachFilter] = useState("");
  const [usageTypeFilter, setUsageTypeFilter] =
    useState("");

  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");

  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>(
    []
  );

  const fetchMemberships = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/memberships", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          "Failed to fetch memberships"
        );
      }

      const data = await response.json();

      setMemberships(data.memberships ?? []);
    } catch (error) {
      console.error(
        "Failed to fetch memberships:",
        error
      );

      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [branchesResponse, usersResponse] =
        await Promise.all([
          fetch("/api/branches"),
          fetch("/api/users"),
        ]);

      const branchesData =
        await branchesResponse.json();

      const usersData = await usersResponse.json();

      setBranches(
        Array.isArray(branchesData)
          ? branchesData
          : branchesData.branches ?? []
      );

      setCoaches(
        Array.isArray(usersData)
          ? usersData
          : usersData.users ?? []
      );
    } catch (error) {
      console.error(
        "Failed to fetch membership filters:",
        error
      );
    }
  };

  useEffect(() => {
    fetchMemberships();
    fetchFilters();
  }, []);

  const filteredMemberships = useMemo(() => {
    const query = search.trim().toLowerCase();

    return memberships.filter((membership) => {
      const member = membership.member;

      // Search
      const matchesSearch =
        !query ||
        member?.name
          ?.toLowerCase()
          .includes(query) ||
        member?.phone
          ?.toLowerCase()
          .includes(query);

      // Status
      const matchesStatus =
        !statusFilter ||
        membership.status === statusFilter;

      // Branch
      const matchesBranch =
        !branchFilter ||
        member?.branch?.id === branchFilter;

      // Gender
      const matchesGender =
        !genderFilter ||
        String(member?.gender ?? "").toLowerCase() ===
          genderFilter.toLowerCase();

      // Coach
      const matchesCoach =
        !coachFilter ||
        member?.coach?.id === coachFilter;

      // Usage type
      const matchesUsageType =
        !usageTypeFilter ||
        String(
          membership.usageType ?? ""
        ).toLowerCase() ===
          usageTypeFilter.toLowerCase();

      // Membership start date
      const membershipStartDate =
        membership.startDate
          ? new Date(membership.startDate)
          : null;

      const fromDate = joinedFrom
        ? new Date(`${joinedFrom}T00:00:00`)
        : null;

      const toDate = joinedTo
        ? new Date(`${joinedTo}T23:59:59`)
        : null;

      const matchesFrom =
        !fromDate ||
        !membershipStartDate ||
        membershipStartDate >= fromDate;

      const matchesTo =
        !toDate ||
        !membershipStartDate ||
        membershipStartDate <= toDate;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesBranch &&
        matchesGender &&
        matchesCoach &&
        matchesUsageType &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    memberships,
    search,
    statusFilter,
    branchFilter,
    genderFilter,
    coachFilter,
    usageTypeFilter,
    joinedFrom,
    joinedTo,
  ]);

  const allFilteredSelected =
    filteredMemberships.length > 0 &&
    filteredMemberships.every((membership) =>
      selectedIds.includes(membership.id)
    );

  const toggleMembership = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((current) =>
        current.filter(
          (id) =>
            !filteredMemberships.some(
              (membership) =>
                membership.id === id
            )
        )
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([
          ...current,
          ...filteredMemberships.map(
            (membership) => membership.id
          ),
        ]),
      ]);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setBranchFilter("");
    setGenderFilter("");
    setCoachFilter("");
    setUsageTypeFilter("");
    setJoinedFrom("");
    setJoinedTo("");
  };

  const hasFilters =
    search ||
    statusFilter ||
    branchFilter ||
    genderFilter ||
    coachFilter ||
    usageTypeFilter ||
    joinedFrom ||
    joinedTo;

  const formatDate = (
    value: string | Date | null | undefined
  ) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("en-IN");
  };

  const formatCurrency = (
    value: number | null | undefined
  ) => {
    if (value == null) {
      return "-";
    }

    return `₹${Number(value / 100).toLocaleString(
      "en-IN"
    )}`;
  };

  const getInitials = (name?: string) => {
    if (!name) {
      return "?";
    }

    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const formatDuration = (
    days: number | null | undefined
  ) => {
    if (days == null) {
      return "-";
    }

    if (days === 0) {
      return "Unlimited";
    }

    if (days < 30) {
      return `${days} days`;
    }

    if (days % 30 === 0) {
      const months = days / 30;

      return `${months} ${
        months === 1 ? "month" : "months"
      }`;
    }

    return `${days} days`;
  };

  const formatUsage = (
    membership: Membership
  ) => {
    if (
      membership.usageType
        ?.toUpperCase()
        .includes("DURATION")
    ) {
      return "Unlimited Access";
    }

    if (
      membership.totalSessions != null &&
      membership.remainingSessions != null
    ) {
      return `${membership.remainingSessions}/${membership.totalSessions}`;
    }

    return membership.usageType || "-";
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-lime-400/10 text-lime-400";

      case "FROZEN":
        return "bg-blue-400/10 text-blue-400";

      case "EXPIRED":
        return "bg-neutral-800 text-neutral-400";

      case "CANCELLED":
        return "bg-red-400/10 text-red-400";

      case "TRANSFERRED":
        return "bg-purple-400/10 text-purple-400";

      default:
        return "bg-neutral-800 text-neutral-400";
    }
  };

  const exportMemberships = (
    onlySelected: boolean
  ) => {
    const exportData = onlySelected
      ? filteredMemberships.filter((membership) =>
          selectedIds.includes(membership.id)
        )
      : filteredMemberships;

    if (!exportData.length) {
      return;
    }

    const rows = exportData.map(
      (membership, index) => {
        const member = membership.member;

        return {
          "S.No": index + 1,

          "Membership ID": membership.id,

          "Member ID": member?.id ?? "",

          Name: member?.name ?? "",

          Phone: member?.phone ?? "",

          Email: member?.email ?? "",

          Gender: member?.gender ?? "",

          Age: member?.age ?? "",

          Weight: member?.weight ?? "",

          Height: member?.height ?? "",

          Branch:
            member?.branch?.name ||
            membership.branchName ||
            "",

          Coach: member?.coach?.name ?? "",

          Service: membership.serviceName ?? "",

          Membership:
            membership.packageName ?? "",

          "Duration (Days)":
            membership.packageDurationInDays ??
            "",

          "Duration":
            formatDuration(
              membership.packageDurationInDays
            ),

          "Usage Type":
            membership.usageType ?? "",

          "Total Sessions":
            membership.totalSessions ?? "",

          "Used Sessions":
            membership.usedSessions ?? "",

          "Remaining Sessions":
            membership.remainingSessions ?? "",

          "Start Date":
            formatDate(membership.startDate),

          "End Date":
            formatDate(membership.endDate),

          "Original Price":
            (membership.originalPrice  ?? 0 / 100) ?? "",

          "Final Price":
            (membership.finalPrice ?? 0 / 100) ?? "",

          "Membership Status":
            membership.status,

          "Member Status":
            member?.status ?? "",

          Onboarding: member?.onBoardCompleted
            ? "COMPLETED"
            : "PENDING",

          "Emergency Contact":
            member?.emergencyContact ?? "",

          Address: member?.address ?? "",

          "Referral Code":
            member?.referralCode ?? "",

          "Created At":
            formatDate(membership.createdAt),

          "Updated At":
            formatDate(membership.updatedAt),
        };
      }
    );

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    const filterRows = [
      {
        Filter: "Search",
        Value: search || "All",
      },
      {
        Filter: "Status",
        Value: statusFilter || "All",
      },
      {
        Filter: "Branch",
        Value:
          branches.find(
            (branch) =>
              branch.id === branchFilter
          )?.name || "All",
      },
      {
        Filter: "Gender",
        Value: genderFilter || "All",
      },
      {
        Filter: "Coach",
        Value:
          coaches.find(
            (coach) =>
              coach.id === coachFilter
          )?.name || "All",
      },
      {
        Filter: "Usage Type",
        Value: usageTypeFilter || "All",
      },
      {
        Filter: "Start Date From",
        Value: joinedFrom || "All",
      },
      {
        Filter: "Start Date To",
        Value: joinedTo || "All",
      },
      {
        Filter: "Export Type",
        Value: onlySelected
          ? "Selected Memberships"
          : "All Filtered Memberships",
      },
    ];

    const filterWorksheet =
      XLSX.utils.json_to_sheet(filterRows);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Memberships"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      filterWorksheet,
      "Applied Filters"
    );

    const now = new Date();

    const date = now
      .toISOString()
      .split("T")[0];

    const time = now
      .toTimeString()
      .split(" ")[0]
      .replace(/:/g, "-");

    XLSX.writeFile(
      workbook,
      `memberships_${date}_${time}.xlsx`
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                All Memberships
              </h1>

              <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-400">
                {memberships.length}
              </span>
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              All memberships and subscriptions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchMemberships}
              className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>

            <button
              onClick={() =>
                setShowFilters((value) => !value)
              }
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                showFilters
                  ? "border-lime-400 bg-lime-400/10 text-lime-400"
                  : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700"
              }`}
            >
              <Filter size={16} />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-neutral-800 px-6 py-4">
        <div className="relative max-w-xl">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search by member name or phone..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border-b border-neutral-800 bg-neutral-950 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Status */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                Membership Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              >
                <option value="">
                  All Statuses
                </option>

                {STATUS_OPTIONS.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                Branch
              </label>

              <select
                value={branchFilter}
                onChange={(e) =>
                  setBranchFilter(e.target.value)
                }
                className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              >
                <option value="">
                  All Branches
                </option>

                {branches.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                Gender
              </label>

              <select
                value={genderFilter}
                onChange={(e) =>
                  setGenderFilter(e.target.value)
                }
                className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              >
                <option value="">
                  All Genders
                </option>

                <option value="MALE">
                  Male
                </option>

                <option value="FEMALE">
                  Female
                </option>

                <option value="OTHER">
                  Other
                </option>
              </select>
            </div>

            {/* Coach */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                Coach
              </label>

              <select
                value={coachFilter}
                onChange={(e) =>
                  setCoachFilter(e.target.value)
                }
                className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              >
                <option value="">
                  All Coaches
                </option>

                {coaches.map((coach) => (
                  <option
                    key={coach.id}
                    value={coach.id}
                  >
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Usage */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                Usage Type
              </label>

              <select
                value={usageTypeFilter}
                onChange={(e) =>
                  setUsageTypeFilter(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
              >
                <option value="">
                  All Usage Types
                </option>

                <option value="DURATION">
                  Duration
                </option>

                <option value="SESSION">
                  Session Based
                </option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                Start Date From
              </label>

              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  type="date"
                  value={joinedFrom}
                  onChange={(e) =>
                    setJoinedFrom(e.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-800 bg-black py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                Start Date To
              </label>

              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  type="date"
                  value={joinedTo}
                  onChange={(e) =>
                    setJoinedTo(e.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-800 bg-black py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400"
                />
              </div>
            </div>

            {/* Clear */}
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
              {filteredMemberships.length}
            </span>{" "}
            memberships
          </span>

          {selectedIds.length > 0 && (
            <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-400">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              exportMemberships(false)
            }
            disabled={
              !filteredMemberships.length
            }
            className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} />
            Export All
          </button>

          <button
            onClick={() =>
              exportMemberships(true)
            }
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
                  {allFilteredSelected && (
                    <Check
                      size={12}
                      strokeWidth={3}
                    />
                  )}
                </button>
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Member
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Contact
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Branch
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Membership
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Duration
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Usage
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Period
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Amount
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Status
              </th>

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Coach
              </th>

              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-6 py-16 text-center"
                >
                  <div className="flex items-center justify-center gap-3 text-sm text-neutral-500">
                    <RefreshCcw
                      size={16}
                      className="animate-spin"
                    />

                    Loading memberships...
                  </div>
                </td>
              </tr>
            ) : filteredMemberships.length ===
              0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-6 py-16 text-center"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900">
                      <Filter
                        size={20}
                        className="text-neutral-600"
                      />
                    </div>

                    <p className="text-sm font-medium text-neutral-300">
                      No memberships found
                    </p>

                    <p className="mt-1 text-xs text-neutral-600">
                      Try changing your search or
                      filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMemberships.map(
                (membership) => {
                  const member =
                    membership.member;

                  const selected =
                    selectedIds.includes(
                      membership.id
                    );

                  return (
                    <tr
                      key={membership.id}
                      className={`border-b border-neutral-900 transition hover:bg-neutral-950 ${
                        selected
                          ? "bg-neutral-950"
                          : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            toggleMembership(
                              membership.id
                            )
                          }
                          className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                            selected
                              ? "border-lime-400 bg-lime-400 text-black"
                              : "border-neutral-700 bg-transparent"
                          }`}
                        >
                          {selected && (
                            <Check
                              size={12}
                              strokeWidth={3}
                            />
                          )}
                        </button>
                      </td>

                      {/* Member */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            member &&
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="flex items-center gap-3 text-left"
                        >
                          {/* Profile image */}
                          {member?.profileImage ? (
                            <img
                              src={
                                member.profileImage
                              }
                              alt={
                                member.name
                              }
                              className="h-10 w-10 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-xs font-semibold text-neutral-400">
                              {getInitials(
                                member?.name
                              )}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="truncate font-medium text-white hover:text-lime-400">
                              {member?.name ||
                                "Unknown Member"}
                            </div>

                            <div className="mt-0.5 text-xs text-neutral-600">
                              {member?.gender ||
                                "-"}
                            </div>
                          </div>
                        </button>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            member &&
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="text-left"
                        >
                          <div className="text-sm text-neutral-300 hover:text-lime-400">
                            {member?.phone ||
                              "-"}
                          </div>

                          <div className="mt-0.5 text-xs text-neutral-600">
                            {member?.email ||
                              ""}
                          </div>
                        </button>
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-neutral-300">
                          {membership.branchName ||
                            member?.branch
                              ?.name ||
                            "-"}
                        </span>
                      </td>

                      {/* Membership */}
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium text-neutral-200">
                            {membership.packageName ||
                              "-"}
                          </div>

                          <div className="mt-0.5 text-xs text-neutral-600">
                            {membership.serviceName ||
                              ""}
                          </div>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-neutral-300">
                          {formatDuration(
                            membership.packageDurationInDays
                          )}
                        </span>
                      </td>

                      {/* Usage */}
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm text-neutral-300">
                            {formatUsage(
                              membership
                            )}
                          </div>

                          {membership.totalSessions !=
                            null &&
                            membership.remainingSessions !=
                              null && (
                              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-neutral-800">
                                <div
                                  className="h-full rounded-full bg-lime-400"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        (membership.usedSessions ??
                                          0) /
                                          Math.max(
                                            1,
                                            membership.totalSessions
                                          )
                                      ) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                            )}
                        </div>
                      </td>

                      {/* Period */}
                      <td className="px-4 py-4">
                        <div className="whitespace-nowrap text-sm text-neutral-300">
                          {formatDate(
                            membership.startDate
                          )}
                        </div>

                        <div className="mt-0.5 whitespace-nowrap text-xs text-neutral-600">
                          to{" "}
                          {formatDate(
                            membership.endDate
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-neutral-300">
                          {formatCurrency(
                            membership.finalPrice
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            membership.status
                          )}`}
                        >
                          {membership.status}
                        </span>
                      </td>

                      {/* Coach */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-neutral-300">
                          {member?.coach?.name ||
                            "-"}
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            member &&
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="text-neutral-600 transition hover:text-white"
                        >
                          <ChevronDown
                            size={16}
                            className="-rotate-90"
                          />
                        </button>
                      </td>
                    </tr>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}