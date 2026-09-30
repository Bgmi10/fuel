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

type MemberWithRelations = MemberType & {
  currentStatus: string;
  branch?: {
    id: string;
    name: string;
  } | null;
  coach?: {
    id: string;
    name: string;
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
  "ALL",
  "ACTIVE",
  "EXPIRED",
  "FROZEN",
  "CANCELLED",
];

const GENDER_OPTIONS = [
  "ALL",
  "MALE",
  "FEMALE",
  "OTHER",
];

const ONBOARDING_OPTIONS = [
  "ALL",
  "COMPLETED",
  "PENDING",
];

const Member = () => {
  const router = useRouter();

  const [members, setMembers] = useState<MemberWithRelations[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("ALL");
  const [branchId, setBranchId] = useState("ALL");
  const [gender, setGender] = useState("ALL");
  const [onboarding, setOnboarding] = useState("ALL");
  const [coachId, setCoachId] = useState("ALL");

  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");

  const [open, setOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const [showFilters, setShowFilters] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/members/inactive");

      if (!res.ok) {
        throw new Error("Failed to fetch members");
      }

      const data = await res.json();

      setMembers(data.members || []);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterData = async () => {
    setLoadingFilters(true);

    try {
      /*
       * These endpoints assume your application already exposes:
       *
       * GET /api/branches
       * GET /api/users
       *
       * If your existing branch/user endpoints use different paths,
       * change only these two fetch calls.
       */

      const [branchesRes, usersRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/users"),
      ]);

      if (branchesRes.ok) {
        const branchData = await branchesRes.json();

        setBranches(
          branchData.branches ||
            branchData.data ||
            []
        );
      }

      if (usersRes.ok) {
        const userData = await usersRes.json();

        const users =
          userData.users ||
          userData.data ||
          [];

        setCoaches(
          users.filter(
            (user: any) =>
              user.role === "COACH"
          )
        );
      }
    } catch (error) {
      console.error("Failed to fetch filter data:", error);
    } finally {
      setLoadingFilters(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchFilterData();
  }, []);

  const statusStyles: Record<string, string> = {
    ACTIVE: "bg-green-500/20 text-green-400",
    EXPIRED: "bg-red-500/20 text-red-400",
    FROZEN: "bg-blue-500/20 text-blue-400",
    CANCELLED: "bg-yellow-500/20 text-yellow-400",
    NONE: "bg-neutral-700 text-neutral-400",
  };

  const filtered = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return members.filter((member) => {
      /* ---------------------------------------------
         SEARCH
      --------------------------------------------- */

      const matchesSearch =
        !normalizedSearch ||
        member.name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        member.phone
          ?.toLowerCase()
          .includes(normalizedSearch);

      /* ---------------------------------------------
         STATUS
      --------------------------------------------- */

      const matchesStatus =
        status === "ALL" ||
        member.currentStatus === status;

      /* ---------------------------------------------
         BRANCH
      --------------------------------------------- */

      const matchesBranch =
        branchId === "ALL" ||
        member.branchId === branchId;

      /* ---------------------------------------------
         GENDER
      --------------------------------------------- */

      const matchesGender =
        gender === "ALL" ||
        member.gender?.toUpperCase() === gender;

      /* ---------------------------------------------
         ONBOARDING
      --------------------------------------------- */

      const matchesOnboarding =
        onboarding === "ALL" ||
        (onboarding === "COMPLETED" &&
          member.onBoardCompleted === true) ||
        (onboarding === "PENDING" &&
          member.onBoardCompleted === false);

      /* ---------------------------------------------
         COACH
      --------------------------------------------- */

      const matchesCoach =
        coachId === "ALL" ||
        member.coachId === coachId;

      /* ---------------------------------------------
         JOINED DATE
      --------------------------------------------- */

      const createdDate = new Date(member.createdAt);

      const matchesFromDate =
        !joinedFrom ||
        createdDate >= new Date(`${joinedFrom}T00:00:00`);

      const matchesToDate =
        !joinedTo ||
        createdDate <= new Date(`${joinedTo}T23:59:59.999`);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesBranch &&
        matchesGender &&
        matchesOnboarding &&
        matchesCoach &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }, [
    members,
    search,
    status,
    branchId,
    gender,
    onboarding,
    coachId,
    joinedFrom,
    joinedTo,
  ]);

  /* ---------------------------------------------
     SELECTED MEMBERS
  --------------------------------------------- */

  const selectedMembers = useMemo(() => {
    const selectedSet = new Set(selectedIds);

    return filtered.filter((member) =>
      selectedSet.has(member.id)
    );
  }, [filtered, selectedIds]);

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((member) =>
      selectedIds.includes(member.id)
    );

  const toggleMember = (
    id: string
  ) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter(
          (memberId) => memberId !== id
        );
      }

      return [...current, id];
    });
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(
        filtered.map((member) => member.id)
      );

      setSelectedIds((current) =>
        current.filter(
          (id) => !filteredIds.has(id)
        )
      );

      return;
    }

    setSelectedIds((current) => {
      const existing = new Set(current);

      filtered.forEach((member) => {
        existing.add(member.id);
      });

      return Array.from(existing);
    });
  };

  /* ---------------------------------------------
     CLEAR FILTERS
  --------------------------------------------- */

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setBranchId("ALL");
    setGender("ALL");
    setOnboarding("ALL");
    setCoachId("ALL");
    setJoinedFrom("");
    setJoinedTo("");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "ALL" ||
    branchId !== "ALL" ||
    gender !== "ALL" ||
    onboarding !== "ALL" ||
    coachId !== "ALL" ||
    joinedFrom !== "" ||
    joinedTo !== "";

  /* ---------------------------------------------
     EXCEL EXPORT
  --------------------------------------------- */

  const exportToExcel = () => {
    const rowsToExport =
      selectedMembers.length > 0
        ? selectedMembers
        : filtered;

    if (rowsToExport.length === 0) {
      window.alert(
        "There are no members to export."
      );
      return;
    }

    setExporting(true);

    try {
      const excelRows = rowsToExport.map(
        (member, index) => ({
          "S.No": index + 1,

          "Member ID": member.id,

          "Name": member.name,

          "Phone": member.phone,

          "Email": member.email || "",

          "Date of Birth": member.dob || "",

          "Gender": member.gender || "",

          "Age": member.age ?? "",

          "Weight": member.weight ?? "",

          "Height": member.height ?? "",

          "Branch":
            member.branch?.name || "",

          "Coach":
            member.coach?.name || "",

          "Status":
            member.currentStatus || "",

          "Member Status":
            member.status || "",

          "Onboarding":
            member.onBoardCompleted
              ? "Completed"
              : "Pending",

          "Emergency Contact":
            member.emergencyContact || "",

          "Address":
            member.address || "",

          "Referral Code":
            member.referralCode || "",

          "Joined Date":
            new Date(
              member.createdAt
            ).toLocaleDateString("en-IN"),

          "Updated Date":
            new Date(
              member.updatedAt
            ).toLocaleDateString("en-IN"),
        })
      );

      /* -----------------------------------------
         MEMBERS SHEET
      ----------------------------------------- */

      const membersSheet =
        XLSX.utils.json_to_sheet(
          excelRows
        );

      membersSheet["!cols"] = [
        { wch: 8 },
        { wch: 28 },
        { wch: 24 },
        { wch: 16 },
        { wch: 32 },
        { wch: 16 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 12 },
        { wch: 22 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 20 },
        { wch: 35 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
      ];

      if (excelRows.length > 0) {
        membersSheet["!autofilter"] = {
          ref: `A1:T${excelRows.length + 1}`,
        };
      }

      /* -----------------------------------------
         FILTER SUMMARY SHEET
      ----------------------------------------- */

      const selectedMode =
        selectedMembers.length > 0
          ? "Selected members"
          : "All filtered members";

      const selectedBranch =
        branchId === "ALL"
          ? "All branches"
          : branches.find(
              (branch) =>
                branch.id === branchId
            )?.name || branchId;

      const selectedCoach =
        coachId === "ALL"
          ? "All coaches"
          : coaches.find(
              (coach) =>
                coach.id === coachId
            )?.name || coachId;

      const filterRows = [
        ["Member Export"],
        [],
        ["Exported At", new Date().toLocaleString("en-IN")],
        ["Records Exported", rowsToExport.length],
        ["Export Type", selectedMode],
        [],
        ["Applied Filters", "Value"],
        ["Search", search || "All"],
        ["Status", status],
        ["Branch", selectedBranch],
        ["Gender", gender],
        [
          "Onboarding",
          onboarding,
        ],
        ["Coach", selectedCoach],
        ["Joined From", joinedFrom || "All"],
        ["Joined To", joinedTo || "All"],
      ];

      const filterSheet =
        XLSX.utils.aoa_to_sheet(
          filterRows
        );

      filterSheet["!cols"] = [
        { wch: 25 },
        { wch: 35 },
      ];

      /* -----------------------------------------
         WORKBOOK
      ----------------------------------------- */

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        membersSheet,
        "Members"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        filterSheet,
        "Applied Filters"
      );

      /* -----------------------------------------
         FILE NAME
      ----------------------------------------- */

      const now = new Date();

      const datePart =
        now.toISOString()
          .slice(0, 10);

      const timePart =
        now
          .toTimeString()
          .slice(0, 8)
          .replace(/:/g, "-");

      const filename =
        `members_${datePart}_${timePart}.xlsx`;

      XLSX.writeFile(
        workbook,
        filename,
        {
          compression: true,
        }
      );

      setSelectedIds([]);
    } catch (error) {
      console.error(
        "Excel export failed:",
        error
      );

      window.alert(
        "Failed to export members."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-6 text-white">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-bold">
            Members
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Manage your gym members
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={fetchMembers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
          >
            <RefreshCcw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            disabled={
              exporting ||
              filtered.length === 0
            }
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

      {/* =====================================================
          SEARCH + FILTER TOGGLE
      ===================================================== */}

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
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-neutral-800 bg-black py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-400/50"
            />

          </div>

          <button
            type="button"
            onClick={() =>
              setShowFilters(
                (value) => !value
              )
            }
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
              showFilters ||
              hasActiveFilters
                ? "border-lime-400/30 bg-lime-400/10 text-lime-300"
                : "border-neutral-800 bg-black text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            <Filter size={16} />

            Filters

            <ChevronDown
              size={15}
              className={`transition-transform ${
                showFilters
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

        </div>

        {/* =================================================
            FILTER PANEL
        ================================================= */}

        {showFilters && (
          <div className="mt-4 border-t border-neutral-800 pt-4">

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {/* STATUS */}

              <FilterSelect
                label="Status"
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS.map(
                  (value) => ({
                    value,
                    label:
                      value === "ALL"
                        ? "All Statuses"
                        : value,
                  })
                )}
              />

              {/* BRANCH */}

              <FilterSelect
                label="Branch"
                value={branchId}
                onChange={setBranchId}
                options={[
                  {
                    value: "ALL",
                    label: "All Branches",
                  },
                  ...branches.map(
                    (branch) => ({
                      value: branch.id,
                      label: branch.name,
                    })
                  ),
                ]}
              />

              {/* GENDER */}

              <FilterSelect
                label="Gender"
                value={gender}
                onChange={setGender}
                options={GENDER_OPTIONS.map(
                  (value) => ({
                    value,
                    label:
                      value === "ALL"
                        ? "All Genders"
                        : value,
                  })
                )}
              />

              {/* ONBOARDING */}

              <FilterSelect
                label="Onboarding"
                value={onboarding}
                onChange={setOnboarding}
                options={ONBOARDING_OPTIONS.map(
                  (value) => ({
                    value,
                    label:
                      value === "ALL"
                        ? "All Members"
                        : value ===
                            "COMPLETED"
                          ? "Completed"
                          : "Pending",
                  })
                )}
              />

              {/* COACH */}

              <FilterSelect
                label="Coach"
                value={coachId}
                onChange={setCoachId}
                options={[
                  {
                    value: "ALL",
                    label: "All Coaches",
                  },
                  ...coaches.map(
                    (coach) => ({
                      value: coach.id,
                      label: coach.name,
                    })
                  ),
                ]}
              />

              {/* JOINED FROM */}

              <DateFilter
                label="Joined From"
                value={joinedFrom}
                onChange={setJoinedFrom}
              />

              {/* JOINED TO */}

              <DateFilter
                label="Joined To"
                value={joinedTo}
                onChange={setJoinedTo}
              />

              {/* CLEAR */}

              <div className="flex items-end">

                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={
                    !hasActiveFilters
                  }
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

      {/* =====================================================
          STATUS QUICK FILTERS
      ===================================================== */}

      

      {/* =====================================================
          RESULT SUMMARY
      ===================================================== */}

      <div className="mb-4 flex flex-col gap-2 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">

        <div>
          Showing{" "}
          <span className="font-semibold text-white">
            {filtered.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-white">
            {members.length}
          </span>{" "}
          members
        </div>

        {selectedMembers.length > 0 && (
          <div className="text-lime-300">
            {selectedMembers.length} member
            {selectedMembers.length !== 1
              ? "s"
              : ""}{" "}
            selected
          </div>
        )}

      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1000px] text-sm">

            <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">

              <tr>

                <th className="w-12 px-4 py-4 text-center">

                  <input
                    type="checkbox"
                    checked={
                      allFilteredSelected
                    }
                    onChange={
                      toggleAllFiltered
                    }
                    disabled={
                      filtered.length === 0
                    }
                    className="h-4 w-4 cursor-pointer accent-lime-400"
                  />

                </th>

                <th className="px-4 py-4 text-left">
                  Name
                </th>

                <th className="px-4 py-4 text-left">
                  Phone
                </th>

                <th className="px-4 py-4 text-left">
                  DOB
                </th>

                <th className="px-4 py-4 text-left">
                  Branch
                </th>

                <th className="px-4 py-4 text-left">
                  Coach
                </th>

                <th className="px-4 py-4 text-left">
                  Joined
                </th>

                <th className="px-4 py-4 text-left">
                  Onboarding
                </th>

                <th className="px-4 py-4 text-left">
                  Status
                </th>

              </tr>

            </thead>

            <tbody>

              {filtered.map(
                (member) => {
                  const isSelected =
                    selectedIds.includes(
                      member.id
                    );

                  return (
                    <tr
                      key={member.id}
                      className={`border-b border-neutral-800 transition ${
                        isSelected
                          ? "bg-lime-400/[0.04]"
                          : "hover:bg-neutral-800/40"
                      }`}
                    >

                      {/* CHECKBOX */}

                      <td
                        className="px-4 py-4 text-center"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >

                        <input
                          type="checkbox"
                          checked={
                            isSelected
                          }
                          onChange={() =>
                            toggleMember(
                              member.id
                            )
                          }
                          className="h-4 w-4 cursor-pointer accent-lime-400"
                        />

                      </td>

                      {/* NAME */}

                      <td
                        className="cursor-pointer px-4 py-4"
                        onClick={() =>
                          router.push(
                            `/dashboard/members/${member.id}`
                          )
                        }
                      >

                        <div className="font-medium text-white">
                          {member.name}
                        </div>

                        {member.age != null && (
                          <div className="mt-0.5 text-xs text-neutral-600">
                            {member.gender}
                          </div>
                        )}

                      </td>

                      {/* PHONE */}

                      <td
                        className="cursor-pointer px-4 py-4 text-neutral-300"
                        onClick={() =>
                          router.push(
                            `/dashboard/members/${member.id}`
                          )
                        }
                      >
                        {member.phone}
                      </td>

                      {/* EMAIL */}

                      <td
                        className="cursor-pointer px-4 py-4 text-neutral-400"
                        onClick={() =>
                          router.push(
                            `/dashboard/members/${member.id}`
                          )
                        }
                      >
                         {new Date(
                          member?.dob ?? ""
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>

                      {/* BRANCH */}

                      <td
                        className="cursor-pointer px-4 py-4 text-neutral-400"
                        onClick={() =>
                          router.push(
                            `/dashboard/members/${member.id}`
                          )
                        }
                      >
                        {member.branch?.name ||
                          "-"}
                      </td>

                      {/* COACH */}

                      <td
                        className="cursor-pointer px-4 py-4 text-neutral-400"
                        onClick={() =>
                          router.push(
                            `/dashboard/members/${member.id}`
                          )
                        }
                      >
                        {member.coach?.name ||
                          "-"}
                      </td>

                      {/* JOINED */}

                      <td
                        className="cursor-pointer px-4 py-4 text-xs text-neutral-500"
                        onClick={() =>
                          router.push(
                            `/dashboard/members/${member.id}`
                          )
                        }
                      >
                        {new Date(
                          member.createdAt
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>

                      {/* ONBOARDING */}

                      <td
                        className="cursor-pointer px-4 py-4"
                        onClick={() =>
                          router.push(
                            `/dashboard/members/${member.id}`
                          )
                        }
                      >

                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                            member.onBoardCompleted
                              ? "bg-green-500/20 text-green-400"
                              : "bg-orange-500/20 text-orange-400"
                          }`}
                        >

                          {member.onBoardCompleted && (
                            <Check size={12} />
                          )}

                          {member.onBoardCompleted
                            ? "Completed"
                            : "Pending"}

                        </span>

                      </td>

                      {/* STATUS */}

                      <td
                        className="cursor-pointer px-4 py-4"
                        onClick={() =>
                          router.push(
                            `/dashboard/members/${member.id}`
                          )
                        }
                      >

                        <span
                          className={`rounded-md px-2 py-1 text-xs ${
                            statusStyles[
                              member.currentStatus
                            ] ||
                            statusStyles.NONE
                          }`}
                        >
                          {member.currentStatus}
                        </span>

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {!loading &&
          filtered.length === 0 && (
            <div className="px-6 py-16 text-center">

              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
                <Search
                  size={20}
                  className="text-neutral-500"
                />
              </div>

              <p className="text-sm font-medium text-white">
                No members found
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Try changing your search or
                filters.
              </p>

            </div>
          )}

      </div>

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <div className="mt-4 text-sm text-neutral-500">
          Loading members...
        </div>
      )}

      {/* =====================================================
          MEMBER MODAL
      ===================================================== */}

      {open && (
        <MemberModal
          open={open}
          setOpen={setOpen}
          onSuccess={() => {
            window.alert(
              "Member created successfully"
            );

            setOpen(false);

            fetchMembers();
          }}
        />
      )}

    </div>
  );
};

/* =========================================================
   FILTER SELECT
========================================================= */

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
};

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: FilterSelectProps) => {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-[42px] w-full rounded-lg border border-neutral-800 bg-black px-3 text-sm text-white outline-none focus:border-lime-400/50"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/* =========================================================
   DATE FILTER
========================================================= */

type DateFilterProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const DateFilter = ({
  label,
  value,
  onChange,
}: DateFilterProps) => {
  return (
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
          style={{ 
            colorScheme: ""
          }}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="h-[42px] w-full rounded-lg border border-neutral-800 bg-black pl-9 pr-3 text-sm text-white outline-none focus:border-lime-400/50"
        />

      </div>
    </div>
  );
};


export default Member;