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
  FileText,
  Filter,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";

type PaymentStatus = "PAID" | "PARTIAL" | "PENDING" | "NO_FEE";

type TransferRow = {
  id: string;
  subscriptionId: string;
  isCurrent: boolean;

  memberId: string;
  name: string;
  phone: string;
  email: string | null;
  profileImage: string | null;

  branchName: string | null;
  packageName: string | null;
  serviceName: string | null;
  startDate: string | null;
  endDate: string | null;

  from: { id: string; name: string; phone: string };

  transferFeePaise: number;
  baseFeePaise: number;
  amountCollectedPaise: number;
  paymentStatus: PaymentStatus;
  paymentMode: string | null;

  status: string;

  remainingDays: number | null;
  feeSlabLabel: string | null;
  reason: string | null;
  transferredByName: string | null;
  transferredAt: string;
};

const STATUS_OPTIONS = [
  "ACTIVE",
  "FROZEN",
  "EXPIRED",
  "CANCELLED",
  "TRANSFERRED",
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partially paid" },
  { value: "PENDING", label: "Pending" },
  { value: "NO_FEE", label: "No fee" },
];

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

const formatMoney = (paise: number | null | undefined) =>
  `₹${((paise ?? 0) / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const getInitials = (name?: string) =>
  name
    ? name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "?";

const statusClass = (status: string) => {
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
      return "bg-orange-500/10 text-orange-400";
    default:
      return "bg-neutral-800 text-neutral-400";
  }
};

const paymentClass = (status: PaymentStatus) => {
  switch (status) {
    case "PAID":
      return "bg-lime-400/10 text-lime-400";
    case "PARTIAL":
      return "bg-amber-400/10 text-amber-300";
    case "PENDING":
      return "bg-red-400/10 text-red-300";
    default:
      return "bg-neutral-800 text-neutral-400";
  }
};

const paymentLabel = (status: PaymentStatus) =>
  PAYMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

const inputClass =
  "w-full rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400";

const labelClass = "mb-1.5 block text-xs font-medium text-neutral-500";

const Transferred = () => {
  const router = useRouter();

  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [byFilter, setByFilter] = useState("");

  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [endFrom, setEndFrom] = useState("");
  const [endTo, setEndTo] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");

  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  /* ---------------- FETCH ---------------- */

  const fetchTransfers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/members/transferred", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Failed to fetch transferred memberships"
        );
      }

      setTransfers(data.transfers ?? []);
    } catch (err) {
      console.error("Failed to fetch transferred memberships:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch transferred memberships"
      );

      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  /* ---------------- FILTER OPTIONS (built from the data) ---------------- */

  const options = useMemo(() => {
    const branches = new Set<string>();
    const memberships = new Set<string>();
    const services = new Set<string>();
    const modes = new Set<string>();
    const handlers = new Set<string>();

    for (const t of transfers) {
      if (t.branchName) branches.add(t.branchName);
      if (t.packageName) memberships.add(t.packageName);
      if (t.serviceName) services.add(t.serviceName);
      if (t.paymentMode) modes.add(t.paymentMode);
      if (t.transferredByName) handlers.add(t.transferredByName);
    }

    const sort = (set: Set<string>) =>
      Array.from(set).sort((a, b) => a.localeCompare(b));

    return {
      branches: sort(branches),
      memberships: sort(memberships),
      services: sort(services),
      modes: sort(modes),
      handlers: sort(handlers),
    };
  }, [transfers]);

  /* ---------------- FILTERING ---------------- */

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = minAmount === "" ? null : Number(minAmount);
    const max = maxAmount === "" ? null : Number(maxAmount);

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

    return transfers.filter((t) => {
      if (query) {
        const haystack = [
          t.name,
          t.phone,
          t.email,
          t.from.name,
          t.from.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      if (statusFilter && t.status !== statusFilter) return false;
      if (paymentStatusFilter && t.paymentStatus !== paymentStatusFilter) {
        return false;
      }
      if (branchFilter && t.branchName !== branchFilter) return false;
      if (membershipFilter && t.packageName !== membershipFilter) return false;
      if (serviceFilter && t.serviceName !== serviceFilter) return false;
      if (modeFilter && t.paymentMode !== modeFilter) return false;
      if (byFilter && t.transferredByName !== byFilter) return false;

      const rupees = t.transferFeePaise / 100;

      if (min !== null && Number.isFinite(min) && rupees < min) return false;
      if (max !== null && Number.isFinite(max) && rupees > max) return false;

      return (
        inRange(t.startDate, startFrom, startTo) &&
        inRange(t.endDate, endFrom, endTo) &&
        inRange(t.transferredAt, transferFrom, transferTo)
      );
    });
  }, [
    transfers,
    search,
    statusFilter,
    paymentStatusFilter,
    branchFilter,
    membershipFilter,
    serviceFilter,
    modeFilter,
    byFilter,
    startFrom,
    startTo,
    endFrom,
    endTo,
    transferFrom,
    transferTo,
    minAmount,
    maxAmount,
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

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.includes(t.id));

  const toggleRow = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !filtered.some((t) => t.id === id))
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([...current, ...filtered.map((t) => t.id)]),
      ]);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPaymentStatusFilter("");
    setBranchFilter("");
    setMembershipFilter("");
    setServiceFilter("");
    setModeFilter("");
    setByFilter("");
    setStartFrom("");
    setStartTo("");
    setEndFrom("");
    setEndTo("");
    setTransferFrom("");
    setTransferTo("");
    setMinAmount("");
    setMaxAmount("");
  };

  const hasFilters = Boolean(
    search ||
      statusFilter ||
      paymentStatusFilter ||
      branchFilter ||
      membershipFilter ||
      serviceFilter ||
      modeFilter ||
      byFilter ||
      startFrom ||
      startTo ||
      endFrom ||
      endTo ||
      transferFrom ||
      transferTo ||
      minAmount ||
      maxAmount
  );

  /* ---------------- EXPORT ---------------- */

  const exportTransfers = (onlySelected: boolean) => {
    const exportData = onlySelected
      ? filtered.filter((t) => selectedIds.includes(t.id))
      : filtered;

    if (!exportData.length) return;

    const rows = exportData.map((t, index) => ({
      "S.No": index + 1,
      "Transfer ID": t.id,
      "Subscription ID": t.subscriptionId,
      Name: t.name,
      Phone: t.phone,
      Email: t.email ?? "",
      Branch: t.branchName ?? "",
      Service: t.serviceName ?? "",
      Membership: t.packageName ?? "",
      "Start Date": formatDate(t.startDate),
      "End Date": formatDate(t.endDate),
      "Transferred From": t.from.name,
      "From Phone": t.from.phone,
      "Remaining Days At Transfer": t.remainingDays ?? "",
      "Fee Slab": t.feeSlabLabel ?? "",
      "Transfer Fee Before Tax (₹)": t.baseFeePaise / 100,
      "Transfer Fee (₹)": t.transferFeePaise / 100,
      "Amount Collected (₹)": t.amountCollectedPaise / 100,
      "Payment Status": paymentLabel(t.paymentStatus),
      "Payment Mode": t.paymentMode ?? "",
      Status: t.status,
      "Transferred By": t.transferredByName ?? "",
      "Transferred On": formatDate(t.transferredAt),
      Reason: t.reason ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const filterSummary = [
      { Filter: "Search", Value: search || "All" },
      { Filter: "Status", Value: statusFilter || "All" },
      {
        Filter: "Payment Status",
        Value: paymentStatusFilter
          ? paymentLabel(paymentStatusFilter as PaymentStatus)
          : "All",
      },
      { Filter: "Branch", Value: branchFilter || "All" },
      { Filter: "Membership", Value: membershipFilter || "All" },
      { Filter: "Service", Value: serviceFilter || "All" },
      { Filter: "Payment Mode", Value: modeFilter || "All" },
      { Filter: "Transferred By", Value: byFilter || "All" },
      { Filter: "Start Date From", Value: startFrom || "All" },
      { Filter: "Start Date To", Value: startTo || "All" },
      { Filter: "End Date From", Value: endFrom || "All" },
      { Filter: "End Date To", Value: endTo || "All" },
      { Filter: "Transferred From Date", Value: transferFrom || "All" },
      { Filter: "Transferred To Date", Value: transferTo || "All" },
      { Filter: "Min Amount (₹)", Value: minAmount || "Any" },
      { Filter: "Max Amount (₹)", Value: maxAmount || "Any" },
      {
        Filter: "Export Type",
        Value: onlySelected ? "Selected Transfers" : "All Filtered Transfers",
      },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Transferred");
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(filterSummary),
      "Filters"
    );

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");

    XLSX.writeFile(workbook, `transferred_memberships_${date}_${time}.xlsx`);
  };

  const openMember = (id: string) => router.push(`/dashboard/members/${id}`);

  const textFilters: [string, string, (v: string) => void, string[], string][] =
    [
      ["Status", statusFilter, setStatusFilter, STATUS_OPTIONS, "All Statuses"],
      ["Branch", branchFilter, setBranchFilter, options.branches, "All Branches"],
      [
        "Membership",
        membershipFilter,
        setMembershipFilter,
        options.memberships,
        "All Memberships",
      ],
      [
        "Service",
        serviceFilter,
        setServiceFilter,
        options.services,
        "All Services",
      ],
      [
        "Payment Mode",
        modeFilter,
        setModeFilter,
        options.modes,
        "All Modes",
      ],
      [
        "Transferred By",
        byFilter,
        setByFilter,
        options.handlers,
        "Anyone",
      ],
    ];

  const dateFilters = [
    ["Start Date From", startFrom, setStartFrom],
    ["Start Date To", startTo, setStartTo],
    ["End Date From", endFrom, setEndFrom],
    ["End Date To", endTo, setEndTo],
    ["Transferred From", transferFrom, setTransferFrom],
    ["Transferred To", transferTo, setTransferTo],
  ] as const;

  const headings = [
    "Name",
    "Contact",
    "Branch",
    "Membership",
    "Start Date",
    "End Date",
    "Transferred From",
    "Amount",
    "Status",
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                Transferred Memberships
              </h1>

              <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                {transfers.length}
              </span>
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              Memberships that were transferred from one member to another
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchTransfers}
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
            placeholder="Search by name, phone, email or previous owner..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400"
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border-b border-neutral-800 bg-neutral-950 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {textFilters.map(([label, value, setter, list, allLabel]) => (
              <div key={label}>
                <label className={labelClass}>{label}</label>

                <select
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{allLabel}</option>

                  {list.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div>
              <label className={labelClass}>Payment Status</label>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All</option>

                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
            <span className="font-medium text-white">{filtered.length}</span> of{" "}
            <span className="font-medium text-white">{transfers.length}</span>{" "}
            transfers
          </span>

          {selectedIds.length > 0 && (
            <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-400">
              {selectedIds.length} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportTransfers(false)}
            disabled={!filtered.length}
            className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} />
            Export All
          </button>

          <button
            onClick={() => exportTransfers(true)}
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
        <table className="w-full min-w-[1400px]">
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

              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Bill
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-6 py-16 text-center">
                  <div className="flex items-center justify-center gap-3 text-sm text-neutral-500">
                    <RefreshCcw size={16} className="animate-spin" />
                    Loading transferred memberships...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900">
                      <Filter size={20} className="text-neutral-600" />
                    </div>

                    <p className="text-sm font-medium text-neutral-300">
                      No transferred memberships found
                    </p>

                    <p className="mt-1 text-xs text-neutral-600">
                      Try changing your search or filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((t) => {
                const selected = selectedIds.includes(t.id);

                const cell = "cursor-pointer px-4 py-4";

                return (
                  <tr
                    key={t.id}
                    className={`border-b border-neutral-900 transition hover:bg-neutral-950 ${
                      selected ? "bg-neutral-950" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleRow(t.id)}
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
                    <td className={cell} onClick={() => openMember(t.memberId)}>
                      <div className="flex items-center gap-3">
                        {t.profileImage ? (
                          <img
                            src={t.profileImage}
                            alt={t.name}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-xs font-semibold text-neutral-400">
                            {getInitials(t.name)}
                          </div>
                        )}

                        <div className="min-w-0 truncate font-medium text-white hover:text-lime-400">
                          {t.name}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className={cell} onClick={() => openMember(t.memberId)}>
                      <div className="text-sm text-neutral-300">{t.phone}</div>

                      <div className="mt-0.5 text-xs text-neutral-600">
                        {t.email || ""}
                      </div>
                    </td>

                    {/* Branch */}
                    <td
                      className={`${cell} text-sm text-neutral-300`}
                      onClick={() => openMember(t.memberId)}
                    >
                      {t.branchName || "-"}
                    </td>

                    {/* Membership */}
                    <td className={cell} onClick={() => openMember(t.memberId)}>
                      <div className="font-medium text-neutral-200">
                        {t.packageName || "-"}
                      </div>

                      <div className="mt-0.5 text-xs text-neutral-600">
                        {t.serviceName || ""}
                      </div>
                    </td>

                    {/* Start */}
                    <td
                      className={`${cell} whitespace-nowrap text-sm text-neutral-300`}
                      onClick={() => openMember(t.memberId)}
                    >
                      {formatDate(t.startDate)}
                    </td>

                    {/* End */}
                    <td
                      className={`${cell} whitespace-nowrap text-sm text-neutral-300`}
                      onClick={() => openMember(t.memberId)}
                    >
                      {formatDate(t.endDate)}
                    </td>

                    {/* Transferred from */}
                    <td className={cell} onClick={() => openMember(t.from.id)}>
                      <div className="text-sm font-medium text-neutral-200 hover:text-lime-400">
                        {t.from.name}
                      </div>

                      <div className="mt-0.5 text-xs text-neutral-600">
                        {t.from.phone}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className={cell} onClick={() => openMember(t.memberId)}>
                      <div className="whitespace-nowrap text-sm font-medium text-neutral-200">
                        {formatMoney(t.transferFeePaise)}
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${paymentClass(
                            t.paymentStatus
                          )}`}
                        >
                          {paymentLabel(t.paymentStatus)}
                        </span>

                        {t.paymentStatus === "PARTIAL" && (
                          <span className="text-[11px] text-neutral-600">
                            {formatMoney(t.amountCollectedPaise)} paid
                          </span>
                        )}

                        {t.paymentMode && t.paymentStatus !== "PARTIAL" && (
                          <span className="text-[11px] text-neutral-600">
                            {t.paymentMode}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className={cell} onClick={() => openMember(t.memberId)}>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </td>

                    {/* Bill */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() =>
                          window.open(`/api/transfer-bill/${t.id}`, "_blank")
                        }
                        title="Download transfer bill"
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-800 px-2.5 text-xs text-neutral-400 transition hover:border-lime-400/40 hover:text-lime-300"
                      >
                        <FileText size={14} />
                        Bill
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
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
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
};

export default Transferred;