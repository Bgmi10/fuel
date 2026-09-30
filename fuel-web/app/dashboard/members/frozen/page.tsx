"use client";

import { useEffect, useMemo, useState } from "react";
import { Member as MemberType } from "@prisma/client";
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
  UserPlus,
  X,
} from "lucide-react";
import { MemberModal } from "../MemberModal";

type FrozenSubscription = {
  id: string;
  packageId: string | null;
  status: string;
  endDate: string | null;
};

type FrozenMember = Omit<
  MemberType,
  "createdAt" | "updatedAt" | "dob"
> & {
  createdAt: string;
  updatedAt: string;
  dob: string | null;

  branch?: {
    id: string;
    name: string;
  } | null;

  coach?: {
    id: string;
    name: string;
  } | null;

  currentStatus: "FROZEN";
  currentPlan: string | null;
  endDate: string | null;

  frozenSubscription: FrozenSubscription | null;
};

type Branch = {
  id: string;
  name: string;
};

type Coach = {
  id: string;
  name: string;
};

 const FrozenMembers = () => {
  const router = useRouter();

  const [members, setMembers] = useState<FrozenMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [branchFilter, setBranchFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [onboardingFilter, setOnboardingFilter] = useState("");
  const [coachFilter, setCoachFilter] = useState("");

  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [showFilters, setShowFilters] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchMembers = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/members/frozen");

      if (!response.ok) {
        throw new Error("Failed to fetch frozen members");
      }

      const data = await response.json();

      setMembers(data.members ?? []);
    } catch (error) {
      console.error("Failed to fetch frozen members:", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [branchesResponse, usersResponse] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/users"),
      ]);

      const branchesData = await branchesResponse.json();
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
      console.error("Failed to fetch filters:", error);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchFilters();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      // Search
      const matchesSearch =
        !query ||
        member.name?.toLowerCase().includes(query) ||
        member.phone?.toLowerCase().includes(query);

      // Branch
      const matchesBranch =
        !branchFilter || member.branchId === branchFilter;

      // Gender
      const matchesGender =
        !genderFilter ||
        String(member.gender ?? "").toLowerCase() ===
          genderFilter.toLowerCase();

      // Onboarding
      const matchesOnboarding =
        !onboardingFilter ||
        (onboardingFilter === "COMPLETED" &&
          member.onBoardCompleted === true) ||
        (onboardingFilter === "PENDING" &&
          member.onBoardCompleted === false);

      // Coach
      const matchesCoach =
        !coachFilter || member.coachId === coachFilter;

      // Joined date
      const createdDate = member.createdAt
        ? new Date(member.createdAt)
        : null;

      const fromDate = joinedFrom
        ? new Date(`${joinedFrom}T00:00:00`)
        : null;

      const toDate = joinedTo
        ? new Date(`${joinedTo}T23:59:59`)
        : null;

      const matchesFrom =
        !fromDate || !createdDate || createdDate >= fromDate;

      const matchesTo =
        !toDate || !createdDate || createdDate <= toDate;

      return (
        matchesSearch &&
        matchesBranch &&
        matchesGender &&
        matchesOnboarding &&
        matchesCoach &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    members,
    search,
    branchFilter,
    genderFilter,
    onboardingFilter,
    coachFilter,
    joinedFrom,
    joinedTo,
  ]);

  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((member) => selectedIds.includes(member.id));

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
        current.filter(
          (id) => !filteredMembers.some((member) => member.id === id)
        )
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([
          ...current,
          ...filteredMembers.map((member) => member.id),
        ]),
      ]);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setBranchFilter("");
    setGenderFilter("");
    setOnboardingFilter("");
    setCoachFilter("");
    setJoinedFrom("");
    setJoinedTo("");
  };

  const hasFilters =
    search ||
    branchFilter ||
    genderFilter ||
    onboardingFilter ||
    coachFilter ||
    joinedFrom ||
    joinedTo;

  const formatDate = (
    value: string | Date | null | undefined
  ) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-IN");
  };

  const exportMembers = (onlySelected: boolean) => {
    const exportData = onlySelected
      ? filteredMembers.filter((member) =>
          selectedIds.includes(member.id)
        )
      : filteredMembers;

    if (!exportData.length) {
      return;
    }

    const rows = exportData.map((member, index) => {
      const subscription = member.frozenSubscription;

      return {
        "S.No": index + 1,

        "Member ID": member.id,

        Name: member.name,

        Phone: member.phone,

        Email: member.email ?? "",

        DOB: formatDate(member.dob),

        Gender: member.gender ?? "",

        Age: member.age ?? "",

        Weight: member.weight ?? "",

        Height: member.height ?? "",

        Branch: member.branch?.name ?? "",

        Coach: member.coach?.name ?? "",

        "Member Status": member.status ?? "",

        "Subscription Status": "FROZEN",

        "Package ID": subscription?.packageId ?? "",

        "Subscription ID": subscription?.id ?? "",

        "Subscription End Date": formatDate(
          subscription?.endDate
        ),

        Onboarding: member.onBoardCompleted
          ? "COMPLETED"
          : "PENDING",

        "Emergency Contact":
          member.emergencyContact ?? "",

        Address: member.address ?? "",

        "Referral Code": member.referralCode ?? "",

        "Joined Date": formatDate(member.createdAt),

        "Updated Date": formatDate(member.updatedAt),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const filterSummary = [
      {
        Filter: "Search",
        Value: search || "All",
      },
      {
        Filter: "Branch",
        Value:
          branches.find((branch) => branch.id === branchFilter)
            ?.name || "All",
      },
      {
        Filter: "Gender",
        Value: genderFilter || "All",
      },
      {
        Filter: "Onboarding",
        Value: onboardingFilter || "All",
      },
      {
        Filter: "Coach",
        Value:
          coaches.find((coach) => coach.id === coachFilter)
            ?.name || "All",
      },
      {
        Filter: "Joined From",
        Value: joinedFrom || "All",
      },
      {
        Filter: "Joined To",
        Value: joinedTo || "All",
      },
      {
        Filter: "Subscription Status",
        Value: "FROZEN",
      },
      {
        Filter: "Export Type",
        Value: onlySelected ? "Selected Members" : "All Filtered Members",
      },
    ];

    const filterWorksheet =
      XLSX.utils.json_to_sheet(filterSummary);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Frozen Members"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      filterWorksheet,
      "Filters"
    );

    const now = new Date();

    const date = now.toISOString().split("T")[0];

    const time = now
      .toTimeString()
      .split(" ")[0]
      .replace(/:/g, "-");

    XLSX.writeFile(
      workbook,
      `frozen_members_${date}_${time}.xlsx`
    );
  };

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="border-b border-neutral-800 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">
                  Frozen Members
                </h1>

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
                  showFilters
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
              placeholder="Search by member name or phone..."
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-b border-neutral-800 bg-neutral-950 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  <option value="">All Branches</option>

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
                  <option value="">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Onboarding */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                  Onboarding
                </label>

                <select
                  value={onboardingFilter}
                  onChange={(e) =>
                    setOnboardingFilter(e.target.value)
                  }
                  className="w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
                >
                  <option value="">All</option>
                  <option value="COMPLETED">
                    Completed
                  </option>
                  <option value="PENDING">Pending</option>
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
                  <option value="">All Coaches</option>

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

              {/* Joined From */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                  Joined From
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

              {/* Joined To */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                  Joined To
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
          <table className="w-full min-w-[1350px]">
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
                      <Check size={12} strokeWidth={3} />
                    )}
                  </button>
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Name
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Phone
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  DOB
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Branch
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Coach
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Package
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Freeze End
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Onboarding
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Status
                </th>

                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-6 py-16 text-center"
                  >
                    <div className="flex items-center justify-center gap-3 text-sm text-neutral-500">
                      <RefreshCcw
                        size={16}
                        className="animate-spin"
                      />
                      Loading frozen members...
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
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
                        No frozen members found
                      </p>

                      <p className="mt-1 text-xs text-neutral-600">
                        Try changing your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const selected = selectedIds.includes(
                    member.id
                  );

                  return (
                    <tr
                      key={member.id}
                      className={`border-b border-neutral-900 transition hover:bg-neutral-950 ${
                        selected ? "bg-neutral-950" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            toggleMember(member.id)
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

                      {/* Name */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="text-left"
                        >
                          <div className="font-medium text-white hover:text-lime-400">
                            {member.name}
                          </div>

                          <div className="mt-0.5 text-xs text-neutral-600">
                            {member.email || "No email"}
                          </div>
                        </button>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="text-sm text-neutral-300 hover:text-lime-400"
                        >
                          {member.phone}
                        </button>
                      </td>

                      {/* DOB */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="text-sm text-neutral-400 hover:text-lime-400"
                        >
                          {formatDate(member.dob) || "-"}
                        </button>
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="text-sm text-neutral-300 hover:text-lime-400"
                        >
                          {member.branch?.name || "-"}
                        </button>
                      </td>

                      {/* Coach */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="text-sm text-neutral-300 hover:text-lime-400"
                        >
                          {member.coach?.name || "-"}
                        </button>
                      </td>

                      {/* Package */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="text-sm text-neutral-300 hover:text-lime-400"
                        >
                          {member.currentPlan || "-"}
                        </button>
                      </td>

                      {/* Freeze End */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/members/${member.id}`
                            )
                          }
                          className="text-sm text-neutral-400 hover:text-lime-400"
                        >
                          {formatDate(member.endDate) || "-"}
                        </button>
                      </td>

                      {/* Onboarding */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            member.onBoardCompleted
                              ? "bg-lime-400/10 text-lime-400"
                              : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {member.onBoardCompleted
                            ? "COMPLETED"
                            : "PENDING"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                          FROZEN
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() =>
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MemberModal
        open={open}
        setOpen={setOpen}
        onSuccess={fetchMembers}
      />
    </>
  );
};


export default FrozenMembers;