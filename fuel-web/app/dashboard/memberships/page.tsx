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
  RotateCcw,
  Search,
  UserPlus,
  X,
} from "lucide-react";

type MembershipType = "NEW" | "RENEWAL";

type Membership = {
  id: string;
  type: MembershipType;
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
  amountPaise: number | null;
  invoiceNumber: string | null;

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
    branch: { id: string; name: string } | null;
    coach: { id: string; name: string } | null;
  } | null;
};

const STATUS_OPTIONS = [
  "ACTIVE",
  "FROZEN",
  "EXPIRED",
  "CANCELLED",
  "TRANSFERRED",
];

const PAGE_SIZE = 25;
const IST = "Asia/Kolkata";

/** "YYYY-MM-DD" in IST, so date filters match what staff see. */
const dateKey = (value: string | null | undefined) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-CA", { timeZone: IST });
};

const inputClass =
  "w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400";

const labelClass = "mb-1.5 block text-xs font-medium text-neutral-500";

export default function MembershipsPage() {
  const router = useRouter();

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search
  const [search, setSearch] = useState("");

  // Filters
  const [typeFilter, setTypeFilter] = useState<"" | MembershipType>("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [coachFilter, setCoachFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [usageTypeFilter, setUsageTypeFilter] = useState("");

  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [endFrom, setEndFrom] = useState("");
  const [endTo, setEndTo] = useState("");

  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [showFilters, setShowFilters] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  /* ---------------- FETCH ---------------- */

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/memberships", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to fetch memberships");
      }

      setMemberships(data.memberships ?? []);
    } catch (err) {
      console.error("Failed to fetch memberships:", err);

      setError(
        err instanceof Error ? err.message : "Failed to fetch memberships"
      );

      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  /* ---------------- FILTER OPTIONS (built from the data) ---------------- */

  const options = useMemo(() => {
    const branches = new Map<string, string>();
    const coaches = new Map<string, string>();
    const packages = new Set<string>();
    const services = new Set<string>();

    for (const m of memberships) {
      const branchName = m.branchName || m.member?.branch?.name;

      if (branchName) branches.set(branchName, branchName);
      if (m.member?.coach) {
        coaches.set(m.member.coach.id, m.member.coach.name);
      }
      if (m.packageName) packages.add(m.packageName);
      if (m.serviceName) services.add(m.serviceName);
    }

    const sortText = (a: string, b: string) => a.localeCompare(b);

    return {
      branches: Array.from(branches.values()).sort(sortText),
      packages: Array.from(packages).sort(sortText),
      services: Array.from(services).sort(sortText),
      coaches: Array.from(coaches.entries()).sort((a, b) =>
        a[1].localeCompare(b[1])
      ),
    };
  }, [memberships]);

  /* ---------------- FILTERING ---------------- */

  /**
   * Everything EXCEPT the type filter, so the New / Renewal cards
   * always show both counts for the current filters.
   */
  const baseFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = minAmount === "" ? null : Number(minAmount);
    const max = maxAmount === "" ? null : Number(maxAmount);

    return memberships.filter((m) => {
      const member = m.member;

      if (query) {
        const haystack = [
          member?.name,
          member?.phone,
          member?.email,
          m.invoiceNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      if (statusFilter && m.status !== statusFilter) return false;

      const branchName = m.branchName || member?.branch?.name || "";
      if (branchFilter && branchName !== branchFilter) return false;

      if (packageFilter && m.packageName !== packageFilter) return false;
      if (serviceFilter && m.serviceName !== serviceFilter) return false;
      if (coachFilter && member?.coach?.id !== coachFilter) return false;

      if (
        genderFilter &&
        String(member?.gender ?? "").toLowerCase() !==
          genderFilter.toLowerCase()
      ) {
        return false;
      }

      if (
        usageTypeFilter &&
        !String(m.usageType ?? "")
          .toLowerCase()
          .includes(usageTypeFilter.toLowerCase())
      ) {
        return false;
      }

      const start = dateKey(m.startDate);
      const end = dateKey(m.endDate);

      if (startFrom && (!start || start < startFrom)) return false;
      if (startTo && (!start || start > startTo)) return false;
      if (endFrom && (!end || end < endFrom)) return false;
      if (endTo && (!end || end > endTo)) return false;

      const rupees = (m.amountPaise ?? 0) / 100;

      if (min !== null && Number.isFinite(min) && rupees < min) return false;
      if (max !== null && Number.isFinite(max) && rupees > max) return false;

      return true;
    });
  }, [
    memberships,
    search,
    statusFilter,
    branchFilter,
    packageFilter,
    serviceFilter,
    coachFilter,
    genderFilter,
    usageTypeFilter,
    startFrom,
    startTo,
    endFrom,
    endTo,
    minAmount,
    maxAmount,
  ]);

  const filteredMemberships = useMemo(
    () =>
      typeFilter
        ? baseFiltered.filter((m) => m.type === typeFilter)
        : baseFiltered,
    [baseFiltered, typeFilter]
  );

  // back to page 1 whenever the result set changes
  useEffect(() => {
    setPage(1);
  }, [filteredMemberships]);

  /* ---------------- CARDS ---------------- */

  const counts = useMemo(() => {
    const thisMonth = dateKey(new Date().toISOString()).slice(0, 7);

    const result = {
      NEW: { total: 0, month: 0 },
      RENEWAL: { total: 0, month: 0 },
    };

    for (const m of baseFiltered) {
      result[m.type].total += 1;

      if (dateKey(m.createdAt).slice(0, 7) === thisMonth) {
        result[m.type].month += 1;
      }
    }

    return result;
  }, [baseFiltered]);

  /* ---------------- PAGINATION ---------------- */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMemberships.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const pageRows = filteredMemberships.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /* ---------------- SELECTION ---------------- */

  const allFilteredSelected =
    filteredMemberships.length > 0 &&
    filteredMemberships.every((m) => selectedIds.includes(m.id));

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
        current.filter((id) => !filteredMemberships.some((m) => m.id === id))
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([...current, ...filteredMemberships.map((m) => m.id)]),
      ]);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setBranchFilter("");
    setPackageFilter("");
    setServiceFilter("");
    setCoachFilter("");
    setGenderFilter("");
    setUsageTypeFilter("");
    setStartFrom("");
    setStartTo("");
    setEndFrom("");
    setEndTo("");
    setMinAmount("");
    setMaxAmount("");
  };

  const hasFilters = Boolean(
    search ||
      typeFilter ||
      statusFilter ||
      branchFilter ||
      packageFilter ||
      serviceFilter ||
      coachFilter ||
      genderFilter ||
      usageTypeFilter ||
      startFrom ||
      startTo ||
      endFrom ||
      endTo ||
      minAmount ||
      maxAmount
  );

  /* ---------------- FORMATTERS ---------------- */

  const formatDate = (value: string | Date | null | undefined) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", { timeZone: IST });
  };

  const formatMoney = (paise: number | null | undefined) => {
    if (paise == null) return "-";

    return `₹${(paise / 100).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";

    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const formatDuration = (days: number | null | undefined) => {
    if (days == null) return "-";
    if (days === 0) return "Unlimited";
    if (days < 30) return `${days} days`;

    if (days % 30 === 0) {
      const months = days / 30;
      return `${months} ${months === 1 ? "month" : "months"}`;
    }

    return `${days} days`;
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

  const getTypeClass = (type: MembershipType) =>
    type === "NEW"
      ? "bg-sky-400/10 text-sky-300"
      : "bg-violet-400/10 text-violet-300";

  /* ---------------- EXPORT ---------------- */

  const exportMemberships = (onlySelected: boolean) => {
    const exportData = onlySelected
      ? filteredMemberships.filter((m) => selectedIds.includes(m.id))
      : filteredMemberships;

    if (!exportData.length) return;

    const rows = exportData.map((m, index) => {
      const member = m.member;

      return {
        "S.No": index + 1,
        "Membership ID": m.id,
        "Member ID": member?.id ?? "",
        Name: member?.name ?? "",
        Phone: member?.phone ?? "",
        Email: member?.email ?? "",
        Gender: member?.gender ?? "",
        Branch: m.branchName || member?.branch?.name || "",
        Coach: member?.coach?.name ?? "",
        Service: m.serviceName ?? "",
        Membership: m.packageName ?? "",
        Type: m.type === "NEW" ? "New" : "Renewal",
        "Invoice No": m.invoiceNumber ?? "",
        Duration: formatDuration(m.packageDurationInDays),
        "Usage Type": m.usageType ?? "",
        "Total Sessions": m.totalSessions ?? "",
        "Used Sessions": m.usedSessions ?? "",
        "Remaining Sessions": m.remainingSessions ?? "",
        "Start Date": formatDate(m.startDate),
        "End Date": formatDate(m.endDate),
        "Original Price (₹)":
          m.originalPrice != null ? m.originalPrice / 100 : "",
        "Final Price (₹)": m.finalPrice != null ? m.finalPrice / 100 : "",
        "Amount (₹)": m.amountPaise != null ? m.amountPaise / 100 : "",
        "Membership Status": m.status,
        "Member Status": member?.status ?? "",
        Onboarding: member?.onBoardCompleted ? "COMPLETED" : "PENDING",
        "Emergency Contact": member?.emergencyContact ?? "",
        Address: member?.address ?? "",
        "Referral Code": member?.referralCode ?? "",
        "Created At": formatDate(m.createdAt),
        "Updated At": formatDate(m.updatedAt),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const filterRows = [
      { Filter: "Search", Value: search || "All" },
      {
        Filter: "Type",
        Value:
          typeFilter === "NEW"
            ? "New"
            : typeFilter === "RENEWAL"
            ? "Renewal"
            : "All",
      },
      { Filter: "Status", Value: statusFilter || "All" },
      { Filter: "Branch", Value: branchFilter || "All" },
      { Filter: "Membership", Value: packageFilter || "All" },
      { Filter: "Service", Value: serviceFilter || "All" },
      {
        Filter: "Coach",
        Value:
          options.coaches.find(([id]) => id === coachFilter)?.[1] || "All",
      },
      { Filter: "Gender", Value: genderFilter || "All" },
      { Filter: "Usage Type", Value: usageTypeFilter || "All" },
      { Filter: "Start Date From", Value: startFrom || "All" },
      { Filter: "Start Date To", Value: startTo || "All" },
      { Filter: "End Date From", Value: endFrom || "All" },
      { Filter: "End Date To", Value: endTo || "All" },
      { Filter: "Min Amount (₹)", Value: minAmount || "Any" },
      { Filter: "Max Amount (₹)", Value: maxAmount || "Any" },
      {
        Filter: "Export Type",
        Value: onlySelected
          ? "Selected Memberships"
          : "All Filtered Memberships",
      },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Memberships");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(filterRows),
      "Applied Filters"
    );

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");

    XLSX.writeFile(workbook, `memberships_${date}_${time}.xlsx`);
  };

  const openMember = (id?: string) => {
    if (id) router.push(`/dashboard/members/${id}`);
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">All Memberships</h1>

              <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-400">
                {memberships.length}
              </span>
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              New memberships, renewals and their billing details
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
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 border-b border-neutral-800 px-6 py-5 sm:grid-cols-2">
        {(
          [
            {
              type: "NEW" as const,
              label: "New Memberships",
              icon: UserPlus,
              active: "border-sky-400 bg-sky-400/10",
              idle: "border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10",
              text: "text-sky-300",
            },
            {
              type: "RENEWAL" as const,
              label: "Renewals",
              icon: RotateCcw,
              active: "border-violet-400 bg-violet-400/10",
              idle: "border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10",
              text: "text-violet-300",
            },
          ]
        ).map((card) => {
          const Icon = card.icon;
          const selected = typeFilter === card.type;

          return (
            <button
              key={card.type}
              type="button"
              onClick={() => setTypeFilter(selected ? "" : card.type)}
              className={`rounded-2xl border p-5 text-left transition ${
                selected ? card.active : card.idle
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                    {card.label}
                  </p>

                  <p className="mt-3 text-3xl font-bold text-white">
                    {loading ? "—" : counts[card.type].total}
                  </p>

                  <p className="mt-2 text-xs text-neutral-500">
                    {counts[card.type].month} created this month
                    {selected ? " · click to clear filter" : " · click to filter"}
                  </p>
                </div>

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-black/30 ${card.text}`}
                >
                  <Icon size={20} />
                </div>
              </div>
            </button>
          );
        })}
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
            placeholder="Search by name, phone, email or invoice no..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border-b border-neutral-800 bg-neutral-950 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as "" | MembershipType)
                }
                className={inputClass}
              >
                <option value="">All Types</option>
                <option value="NEW">New</option>
                <option value="RENEWAL">Renewal</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All Branches</option>
                {options.branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Membership</label>
              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All Memberships</option>
                {options.packages.map((pkg) => (
                  <option key={pkg} value={pkg}>
                    {pkg}
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
                {options.services.map((service) => (
                  <option key={service} value={service}>
                    {service}
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
              <label className={labelClass}>Usage Type</label>
              <select
                value={usageTypeFilter}
                onChange={(e) => setUsageTypeFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All Usage Types</option>
                <option value="DURATION">Duration</option>
                <option value="SESSION">Session Based</option>
              </select>
            </div>

            {(
              [
                ["Start Date From", startFrom, setStartFrom],
                ["Start Date To", startTo, setStartTo],
                ["End Date From", endFrom, setEndFrom],
                ["End Date To", endTo, setEndTo],
              ] as const
            ).map(([label, value, setter]) => (
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

            <div>
              <label className={labelClass}>Min Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Max Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Any"
                className={inputClass}
              />
            </div>

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
            onClick={() => exportMemberships(false)}
            disabled={!filteredMemberships.length}
            className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} />
            Export All
          </button>

          <button
            onClick={() => exportMemberships(true)}
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
        <table className="w-full min-w-[1250px]">
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

              {[
                "Name",
                "Contact",
                "Branch",
                "Membership",
                "Start Date",
                "End Date",
                "Amount",
                "Status",
                "Type",
              ].map((heading) => (
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
                <td colSpan={11} className="px-6 py-16 text-center">
                  <div className="flex items-center justify-center gap-3 text-sm text-neutral-500">
                    <RefreshCcw size={16} className="animate-spin" />
                    Loading memberships...
                  </div>
                </td>
              </tr>
            ) : filteredMemberships.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900">
                      <Filter size={20} className="text-neutral-600" />
                    </div>

                    <p className="text-sm font-medium text-neutral-300">
                      No memberships found
                    </p>

                    <p className="mt-1 text-xs text-neutral-600">
                      Try changing your search or filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((m) => {
                const member = m.member;
                const selected = selectedIds.includes(m.id);

                return (
                  <tr
                    key={m.id}
                    className={`border-b border-neutral-900 transition hover:bg-neutral-950 ${
                      selected ? "bg-neutral-950" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleMembership(m.id)}
                        className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                          selected
                            ? "border-lime-400 bg-lime-400 text-black"
                            : "border-neutral-700 bg-transparent"
                        }`}
                      >
                        {selected && <Check size={12} strokeWidth={3} />}
                      </button>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openMember(member?.id)}
                        className="flex items-center gap-3 text-left"
                      >
                        {member?.profileImage ? (
                          <img
                            src={member.profileImage}
                            alt={member.name}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-xs font-semibold text-neutral-400">
                            {getInitials(member?.name)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="truncate font-medium text-white hover:text-lime-400">
                            {member?.name || "Unknown Member"}
                          </div>

                          <div className="mt-0.5 text-xs text-neutral-600">
                            {member?.gender || "-"}
                          </div>
                        </div>
                      </button>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openMember(member?.id)}
                        className="text-left"
                      >
                        <div className="text-sm text-neutral-300 hover:text-lime-400">
                          {member?.phone || "-"}
                        </div>

                        <div className="mt-0.5 text-xs text-neutral-600">
                          {member?.email || ""}
                        </div>
                      </button>
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-neutral-300">
                        {m.branchName || member?.branch?.name || "-"}
                      </span>
                    </td>

                    {/* Membership */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-neutral-200">
                        {m.packageName || "-"}
                      </div>

                      <div className="mt-0.5 text-xs text-neutral-600">
                        {m.serviceName || ""}
                      </div>
                    </td>

                    {/* Start */}
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-300">
                      {formatDate(m.startDate)}
                    </td>

                    {/* End */}
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-neutral-300">
                      {formatDate(m.endDate)}
                    </td>

                    {/* Amount */}
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-neutral-200">
                      {formatMoney(m.amountPaise)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          m.status
                        )}`}
                      >
                        {m.status}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getTypeClass(
                          m.type
                        )}`}
                      >
                        {m.type === "NEW" ? "New" : "Renewal"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => openMember(member?.id)}
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
            {Math.min(currentPage * PAGE_SIZE, filteredMemberships.length)} of{" "}
            {filteredMemberships.length}
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
  );
}