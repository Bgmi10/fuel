"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  RefreshCcw,
  Search,
  User,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Invoice = {
  id: string;
  invoiceNumber: string;

  member: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    age: number | null;
  };

  branch: { id: string; name: string } | null;

  serviceName: string;
  packageName: string;
  packageDurationInDays: number;

  subCategory: { id: string; name: string } | null;

  intent: "NEW" | "EXTEND" | "UPGRADE" | "TRANSFER_FEE";

  status: "PENDING" | "PARTIAL_PAID" | "FULLY_PAID" | "CANCELLED";

  amount: number;

  packageAmount: number;
  discountAmount: number;
  referralDiscountAmount: number;

  paidAmount: number;
  balanceAmount: number;

  totalTax: number | null;

  groupMemberCount: number | null;
  groupDiscountPercentage: number | null;

  salesRep: { id: string; name: string } | null;

  validity: {
    from: string;
    to: string;
    status: string;
  } | null;

  transactionDate: string;

  payment: {
    id: string;
    amount: number;
    paymentMode: string;
    paymentType: "INITIAL" | "BALANCE" | "TRANSFER";
    receiptNumber: string;
    paidAt: string;
  } | null;

  createdAt: string;
  updatedAt: string;
};

type PeriodStat = {
  count: number;
  amount: number;
  paid: number;
  balance: number;
};

type InvoiceResponse = {
  data: Invoice[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  summary: {
    totalCount: number;
    totalAmount: number;
    totalPaid: number;
    totalBalance: number;
  };

  periodStats: {
    month: PeriodStat;
    fy: PeriodStat & { label: string };
  };

  filters: {
    paymentModes: string[];
    paymentTypes: string[];
    statuses: string[];
    intents: string[];
    staff: { id: string; name: string }[];
    services: { id: string; name: string }[];
    subCategories: { id: string; name: string; serviceId: string }[];
    packages: { id: string; name: string; serviceId: string }[];
  };

  scope: {
    branchId: string | null;
    canSelectBranch: boolean;
  };

  branches: { id: string; name: string }[];
};

type Period = "month" | "fy" | "all";

type Filters = {
  search: string;
  from: string;
  to: string;
  endsFrom: string;
  endsTo: string;
  serviceId: string;
  subCategoryId: string;
  packageId: string;
  intent: string;
  status: string;
  paymentMode: string;
  paymentType: string;
  salesRepId: string;
  branchId: string;
  minAmount: string;
  maxAmount: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  from: "",
  to: "",
  endsFrom: "",
  endsTo: "",
  serviceId: "",
  subCategoryId: "",
  packageId: "",
  intent: "",
  status: "",
  paymentMode: "",
  paymentType: "",
  salesRepId: "",
  branchId: "",
  minAmount: "",
  maxAmount: "",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  PARTIAL_PAID: "Partial Paid",
  FULLY_PAID: "Fully Paid",
  CANCELLED: "Cancelled",
};

// Database values stay the same; only the labels change.
const intentLabels: Record<string, string> = {
  NEW: "New",
  EXTEND: "Renewal",
  TRANSFER_FEE: "Transferred",
  UPGRADE: "Upgrade",
};

const paymentTypeLabels: Record<string, string> = {
  INITIAL: "Initial",
  BALANCE: "Balance",
  TRANSFER: "Transfer",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

const formatDate = (value: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
};

const formatDateTime = (value: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
};

const getDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const selectClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-lime-400";

const dateInputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400";

const labelClass = "mb-2 block text-xs font-medium text-zinc-400";

const TABLE_HEADINGS = [
  "Member",
  "Invoice",
  "Membership",
  "Service",
  "Subcategory",
  "Validity",
  "Transaction",
  "Payment",
  "Amount",
  "Sales Rep",
  "Branch",
];

/* ------------------------------------------------------------------ */
/* Period card (acts as a tab)                                         */
/* ------------------------------------------------------------------ */

function PeriodCard({
  title,
  icon,
  stat,
  active,
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  stat?: PeriodStat;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-5 text-left transition ${
        active
          ? "border-lime-400/60 bg-lime-400/5"
          : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-sm ${active ? "text-lime-400" : "text-zinc-400"}`}
          >
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {formatCurrency(stat?.amount || 0)}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {stat?.count || 0} invoice{stat?.count === 1 ? "" : "s"}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            Paid {formatCurrency(stat?.paid || 0)} · Balance{" "}
            {formatCurrency(stat?.balance || 0)}
          </p>
        </div>

        <div className="rounded-lg bg-zinc-900 p-3 text-lime-400">{icon}</div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function InvoicesPage() {
  const [data, setData] = useState<InvoiceResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [period, setPeriod] = useState<Period>("month");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // Search box is debounced so we don't hit the API on every keystroke.
  const [searchInput, setSearchInput] = useState("");

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectAllRef = useRef<HTMLInputElement>(null);

  /**
   * Update one or more filters.
   * Resets to page 1 and clears selection, so rows selected under one
   * filter can't be exported under another.
   */
  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  // Debounce search input -> filters.search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((previous) =>
        previous.search === searchInput.trim()
          ? previous
          : { ...previous, search: searchInput.trim() }
      );
      setPage(1);
      setSelectedIds(new Set());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const hasCustomRange = Boolean(filters.from || filters.to);

  /**
   * Switching period clears any manual invoice date range, because the
   * manual range always wins on the server.
   */
  const changePeriod = (next: Period) => {
    setPeriod(next);
    setFilters((previous) => ({ ...previous, from: "", to: "" }));
    setPage(1);
    setSelectedIds(new Set());
  };

  const buildParams = useCallback(
    (includePagination = true) => {
      const params = new URLSearchParams();

      if (includePagination) {
        params.set("page", String(page));
        params.set("limit", "15");
      }

      params.set("period", period);

      (Object.keys(filters) as (keyof Filters)[]).forEach((key) => {
        const value = filters[key];
        if (value) params.set(key, value);
      });

      return params;
    },
    [page, period, filters]
  );

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);

      const params = buildParams(true);

      const response = await fetch(`/api/invoices?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invoice data");
      }

      const result: InvoiceResponse = await response.json();

      setData(result);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  /* ---------- selection ---------- */

  const currentPageIds = data?.data.map((item) => item.id) || [];

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.has(id));

  const someCurrentPageSelected = currentPageIds.some((id) =>
    selectedIds.has(id)
  );

  useEffect(() => {
    if (!selectAllRef.current) return;

    selectAllRef.current.indeterminate =
      someCurrentPageSelected && !allCurrentPageSelected;
  }, [someCurrentPageSelected, allCurrentPageSelected]);

  const toggleSelection = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleCurrentPage = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (allCurrentPageSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  /**
   * Fetch all invoices matching current filters (API max is 100/page).
   */
  const fetchAllFilteredInvoices = useCallback(async () => {
    const baseParams = buildParams(false);

    baseParams.set("limit", "100");

    const allRecords: Invoice[] = [];

    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages) {
      const params = new URLSearchParams(baseParams);

      params.set("page", String(currentPage));

      const response = await fetch(`/api/invoices?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch all invoices");
      }

      const result: InvoiceResponse = await response.json();

      allRecords.push(...result.data);

      totalPages = result.pagination.totalPages;
      currentPage += 1;
    }

    return allRecords;
  }, [buildParams]);

  const selectAllFiltered = async () => {
    try {
      setExporting(true);

      const records = await fetchAllFilteredInvoices();

      setSelectedIds(new Set(records.map((item) => item.id)));
    } catch (error) {
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  /* ---------- export ---------- */

  const periodLabels: Record<Period, string> = {
    month: "This Month",
    fy: data?.periodStats.fy.label
      ? `This Financial Year (${data.periodStats.fy.label})`
      : "This Financial Year",
    all: "All Time",
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);

      const records = await fetchAllFilteredInvoices();

      const recordsToExport =
        selectedIds.size > 0
          ? records.filter((item) => selectedIds.has(item.id))
          : records;

      if (recordsToExport.length === 0) {
        return;
      }

      const rows = recordsToExport.map((invoice) => ({
        "Invoice Number": invoice.invoiceNumber,
        Member: invoice.member.name,
        Phone: invoice.member.phone,
        Age: invoice.member.age ?? "-",
        Membership: invoice.packageName,
        "Duration (Days)": invoice.packageDurationInDays,
        Service: invoice.serviceName,
        Subcategory: invoice.subCategory?.name || "-",
        Intent: intentLabels[invoice.intent] || invoice.intent,
        "Invoice Date": formatDateTime(invoice.transactionDate),
        "Membership From": invoice.validity
          ? formatDate(invoice.validity.from)
          : "-",
        "Membership To": invoice.validity
          ? formatDate(invoice.validity.to)
          : "-",
        "Payment Mode": invoice.payment?.paymentMode || "-",
        "Payment Type": invoice.payment
          ? paymentTypeLabels[invoice.payment.paymentType] ||
            invoice.payment.paymentType
          : "-",
        Amount: invoice.amount / 100,
        "Paid Amount": invoice.paidAmount / 100,
        "Balance Amount": invoice.balanceAmount / 100,
        Tax: invoice.totalTax ? invoice.totalTax / 100 : 0,
        "Sales Rep": invoice.salesRep?.name || "-",
        Branch: invoice.branch?.name || "-",
        Status: statusLabels[invoice.status] || invoice.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 18 }, // Invoice
        { wch: 24 }, // Member
        { wch: 16 }, // Phone
        { wch: 8 }, // Age
        { wch: 24 }, // Membership
        { wch: 16 }, // Duration
        { wch: 22 }, // Service
        { wch: 22 }, // Subcategory
        { wch: 14 }, // Intent
        { wch: 24 }, // Date
        { wch: 18 }, // From
        { wch: 18 }, // To
        { wch: 16 }, // Mode
        { wch: 14 }, // Type
        { wch: 14 }, // Amount
        { wch: 14 }, // Paid
        { wch: 14 }, // Balance
        { wch: 12 }, // Tax
        { wch: 22 }, // Sales rep
        { wch: 20 }, // Branch
        { wch: 14 }, // Status
      ];

      const nameOf = (
        list: { id: string; name: string }[] | undefined,
        id: string
      ) => list?.find((item) => item.id === id)?.name || "All";

      const summaryRows = [
        {
          Filter: "Period",
          Value: hasCustomRange ? "Custom range" : periodLabels[period],
        },
        { Filter: "Search", Value: filters.search || "All" },
        { Filter: "Invoice From", Value: filters.from || "All" },
        { Filter: "Invoice To", Value: filters.to || "All" },
        { Filter: "Membership Ends From", Value: filters.endsFrom || "All" },
        { Filter: "Membership Ends To", Value: filters.endsTo || "All" },
        {
          Filter: "Service",
          Value: nameOf(data?.filters.services, filters.serviceId),
        },
        {
          Filter: "Subcategory",
          Value: nameOf(data?.filters.subCategories, filters.subCategoryId),
        },
        {
          Filter: "Membership (Package)",
          Value: nameOf(data?.filters.packages, filters.packageId),
        },
        {
          Filter: "Intent",
          Value: filters.intent
            ? intentLabels[filters.intent] || filters.intent
            : "All",
        },
        {
          Filter: "Status",
          Value: filters.status
            ? statusLabels[filters.status] || filters.status
            : "All",
        },
        { Filter: "Payment Mode", Value: filters.paymentMode || "All" },
        {
          Filter: "Payment Type",
          Value: filters.paymentType
            ? paymentTypeLabels[filters.paymentType] || filters.paymentType
            : "All",
        },
        {
          Filter: "Sales Rep",
          Value: nameOf(data?.filters.staff, filters.salesRepId),
        },
        { Filter: "Branch", Value: nameOf(data?.branches, filters.branchId) },
        { Filter: "Min Amount", Value: filters.minAmount || "-" },
        { Filter: "Max Amount", Value: filters.maxAmount || "-" },
        { Filter: "Records Exported", Value: recordsToExport.length },
        {
          Filter: "Total Amount",
          Value:
            recordsToExport.reduce((total, item) => total + item.amount, 0) /
            100,
        },
        {
          Filter: "Total Paid",
          Value:
            recordsToExport.reduce(
              (total, item) => total + item.paidAmount,
              0
            ) / 100,
        },
        {
          Filter: "Total Balance",
          Value:
            recordsToExport.reduce(
              (total, item) => total + item.balanceAmount,
              0
            ) / 100,
        },
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

      summarySheet["!cols"] = [{ wch: 26 }, { wch: 40 }];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      XLSX.writeFile(
        workbook,
        `invoices-${getDateInputValue(new Date())}.xlsx`
      );
    } catch (error) {
      console.error("Invoice export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  /* ---------- filter state ---------- */

  const clearFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setSelectedIds(new Set());
  };

  const activeFilterCount = (Object.keys(filters) as (keyof Filters)[]).filter(
    (key) => Boolean(filters[key])
  ).length;

  const hasFilters = activeFilterCount > 0;

  // Options narrowed by the chosen service
  const subCategoryOptions = (data?.filters.subCategories || []).filter(
    (item) => !filters.serviceId || item.serviceId === filters.serviceId
  );

  const packageOptions = (data?.filters.packages || []).filter(
    (item) => !filters.serviceId || item.serviceId === filters.serviceId
  );

  const activeLabel = hasCustomRange ? "Custom range" : periodLabels[period];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Invoices</h1>

          <p className="mt-1 text-sm text-zinc-400">
            Track and manage membership invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchInvoices}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />

            {exporting
              ? "Preparing..."
              : selectedIds.size > 0
                ? `Export Selected (${selectedIds.size})`
                : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Period cards (also act as tabs) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PeriodCard
          title="This Month"
          icon={<CalendarDays className="h-5 w-5" />}
          stat={data?.periodStats.month}
          active={!hasCustomRange && period === "month"}
          onClick={() => changePeriod("month")}
        />

        <PeriodCard
          title={
            data?.periodStats.fy.label
              ? `This Financial Year (${data.periodStats.fy.label})`
              : "This Financial Year"
          }
          icon={<CalendarRange className="h-5 w-5" />}
          stat={data?.periodStats.fy}
          active={!hasCustomRange && period === "fy"}
          onClick={() => changePeriod("fy")}
        />
      </div>

      {/* Tabs + current view summary */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(["month", "fy", "all"] as Period[]).map((tab) => {
            const active = !hasCustomRange && period === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => changePeriod(tab)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-lime-400 text-black"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {tab === "fy" ? "This Financial Year" : periodLabels[tab]}
              </button>
            );
          })}

          {hasCustomRange && (
            <span className="rounded-lg border border-lime-400/40 bg-lime-400/10 px-3.5 py-2 text-sm font-medium text-lime-400">
              Custom range
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-lime-400" />
            <span className="text-sm text-zinc-400">
              {activeLabel}:{" "}
              <span className="font-semibold text-white">
                {data?.summary.totalCount || 0}
              </span>{" "}
              invoices
            </span>
          </div>

          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-lime-400" />
            <span className="text-sm text-zinc-400">
              Invoiced{" "}
              <span className="font-semibold text-white">
                {formatCurrency(data?.summary.totalAmount || 0)}
              </span>
            </span>
          </div>

          <span className="text-sm text-zinc-400">
            Paid{" "}
            <span className="font-semibold text-white">
              {formatCurrency(data?.summary.totalPaid || 0)}
            </span>
          </span>

          <span className="text-sm text-zinc-400">
            Outstanding{" "}
            <span className="font-semibold text-white">
              {formatCurrency(data?.summary.totalBalance || 0)}
            </span>
          </span>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by member, phone, invoice number, membership or service"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-lime-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
              showFilters || hasFilters
                ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="rounded-full bg-lime-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-zinc-800 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {/* Invoice date from */}
              <div>
                <label className={labelClass}>Invoice Date From</label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="date"
                    value={filters.from}
                    max={filters.to || undefined}
                    onChange={(event) =>
                      updateFilters({ from: event.target.value })
                    }
                    className={dateInputClass}
                  />
                </div>
              </div>

              {/* Invoice date to */}
              <div>
                <label className={labelClass}>Invoice Date To</label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="date"
                    value={filters.to}
                    min={filters.from || undefined}
                    onChange={(event) =>
                      updateFilters({ to: event.target.value })
                    }
                    className={dateInputClass}
                  />
                </div>
              </div>

              {/* Membership ends from */}
              <div>
                <label className={labelClass}>Membership Ends From</label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="date"
                    value={filters.endsFrom}
                    max={filters.endsTo || undefined}
                    onChange={(event) =>
                      updateFilters({ endsFrom: event.target.value })
                    }
                    className={dateInputClass}
                  />
                </div>
              </div>

              {/* Membership ends to */}
              <div>
                <label className={labelClass}>Membership Ends To</label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="date"
                    value={filters.endsTo}
                    min={filters.endsFrom || undefined}
                    onChange={(event) =>
                      updateFilters({ endsTo: event.target.value })
                    }
                    className={dateInputClass}
                  />
                </div>
              </div>

              {/* Service */}
              <div>
                <label className={labelClass}>Service</label>

                <select
                  value={filters.serviceId}
                  onChange={(event) =>
                    updateFilters({
                      serviceId: event.target.value,
                      // dependent filters must be reset
                      subCategoryId: "",
                      packageId: "",
                    })
                  }
                  className={selectClass}
                >
                  <option value="">All services</option>

                  {data?.filters.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              <div>
                <label className={labelClass}>Subcategory</label>

                <select
                  value={filters.subCategoryId}
                  onChange={(event) =>
                    updateFilters({ subCategoryId: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All subcategories</option>

                  {subCategoryOptions.map((subCategory) => (
                    <option key={subCategory.id} value={subCategory.id}>
                      {subCategory.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Membership (package) */}
              <div>
                <label className={labelClass}>Membership</label>

                <select
                  value={filters.packageId}
                  onChange={(event) =>
                    updateFilters({ packageId: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All memberships</option>

                  {packageOptions.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Intent */}
              <div>
                <label className={labelClass}>Intent</label>

                <select
                  value={filters.intent}
                  onChange={(event) =>
                    updateFilters({ intent: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All intents</option>

                  {data?.filters.intents.map((value) => (
                    <option key={value} value={value}>
                      {intentLabels[value] || value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className={labelClass}>Status</label>

                <select
                  value={filters.status}
                  onChange={(event) =>
                    updateFilters({ status: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All statuses</option>

                  {data?.filters.statuses.map((value) => (
                    <option key={value} value={value}>
                      {statusLabels[value] || value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment mode */}
              <div>
                <label className={labelClass}>Payment Mode</label>

                <select
                  value={filters.paymentMode}
                  onChange={(event) =>
                    updateFilters({ paymentMode: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All payment modes</option>

                  {data?.filters.paymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment type */}
              <div>
                <label className={labelClass}>Payment Type</label>

                <select
                  value={filters.paymentType}
                  onChange={(event) =>
                    updateFilters({ paymentType: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All payment types</option>

                  {data?.filters.paymentTypes.map((type) => (
                    <option key={type} value={type}>
                      {paymentTypeLabels[type] || type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sales rep */}
              <div>
                <label className={labelClass}>Sales Rep</label>

                <select
                  value={filters.salesRepId}
                  onChange={(event) =>
                    updateFilters({ salesRepId: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All sales reps</option>

                  {data?.filters.staff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch */}
              {data?.scope.canSelectBranch && (
                <div>
                  <label className={labelClass}>Branch</label>

                  <select
                    value={filters.branchId}
                    onChange={(event) =>
                      updateFilters({
                        branchId: event.target.value,
                        salesRepId: "", // staff list depends on branch
                      })
                    }
                    className={selectClass}
                  >
                    <option value="">All branches</option>

                    {data.branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Min amount */}
              <div>
                <label className={labelClass}>Min Amount (₹)</label>

                <input
                  type="number"
                  min={0}
                  value={filters.minAmount}
                  onChange={(event) =>
                    updateFilters({ minAmount: event.target.value })
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              {/* Max amount */}
              <div>
                <label className={labelClass}>Max Amount (₹)</label>

                <input
                  type="number"
                  min={0}
                  value={filters.maxAmount}
                  onChange={(event) =>
                    updateFilters({ maxAmount: event.target.value })
                  }
                  placeholder="Any"
                  className={inputClass}
                />
              </div>
            </div>

            {hasFilters && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection toolbar */}
      {data && data.data.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-300">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "No rows selected"}
            </span>

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-zinc-500 hover:text-white"
              >
                Clear selection
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={selectAllFiltered}
            disabled={exporting}
            className="text-sm font-medium text-lime-400 hover:text-lime-300 disabled:opacity-50"
          >
            Select all filtered
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] text-left">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleCurrentPage}
                    disabled={!data || data.data.length === 0}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-lime-400"
                  />
                </th>

                {TABLE_HEADINGS.map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    {heading}
                  </th>
                ))}

                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={13}
                    className="px-4 py-16 text-center text-sm text-zinc-500"
                  >
                    Loading invoices...
                  </td>
                </tr>
              ) : !data || data.data.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 text-zinc-700" />

                      <p className="mt-3 text-sm font-medium text-zinc-400">
                        No invoices found
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        Try changing the period, filters or search.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.data.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={`transition hover:bg-zinc-900/40 ${
                      selectedIds.has(invoice.id) ? "bg-lime-400/[0.03]" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(invoice.id)}
                        onChange={() => toggleSelection(invoice.id)}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-lime-400"
                      />
                    </td>

                    {/* Member */}
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/members/${invoice.member.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900">
                          <User className="h-4 w-4 text-zinc-500" />
                        </div>

                        <div>
                          <p className="font-medium text-white hover:text-lime-400">
                            {invoice.member.name}
                          </p>

                          <p className="mt-0.5 text-xs text-zinc-500">
                            {invoice.member.phone}
                            {invoice.member.age != null &&
                              ` • ${invoice.member.age} yrs`}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Invoice */}
                    <td className="px-4 py-4">
                      <p className="font-medium text-zinc-200">
                        {invoice.invoiceNumber}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {intentLabels[invoice.intent] || invoice.intent}
                      </p>
                    </td>

                    {/* Membership */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-200">
                        {invoice.packageName || "-"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {invoice.packageDurationInDays} days
                      </p>
                    </td>

                    {/* Service */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-200">
                        {invoice.serviceName || "-"}
                      </p>
                    </td>

                    {/* Subcategory */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">
                        {invoice.subCategory?.name || "-"}
                      </p>
                    </td>

                    {/* Validity */}
                    <td className="px-4 py-4">
                      {invoice.validity ? (
                        <div>
                          <p className="text-sm text-zinc-200">
                            {formatDate(invoice.validity.from)}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            to {formatDate(invoice.validity.to)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-600">-</span>
                      )}
                    </td>

                    {/* Transaction */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-200">
                        {formatDateTime(invoice.transactionDate)}
                      </p>

                      <span
                        className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs ${
                          invoice.status === "FULLY_PAID"
                            ? "bg-lime-400/10 text-lime-400"
                            : invoice.status === "PARTIAL_PAID"
                              ? "bg-yellow-400/10 text-yellow-400"
                              : invoice.status === "CANCELLED"
                                ? "bg-red-400/10 text-red-400"
                                : "bg-zinc-900 text-zinc-400"
                        }`}
                      >
                        {statusLabels[invoice.status] || invoice.status}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-4">
                      {invoice.payment ? (
                        <div>
                          <span className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                            {invoice.payment.paymentMode}
                          </span>

                          <p className="mt-1 text-xs text-zinc-500">
                            {paymentTypeLabels[invoice.payment.paymentType] ||
                              invoice.payment.paymentType}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-600">Unpaid</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4">
                      <p className="font-semibold text-lime-400">
                        {formatCurrency(invoice.amount)}
                      </p>

                      {invoice.balanceAmount > 0 && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Balance: {formatCurrency(invoice.balanceAmount)}
                        </p>
                      )}
                    </td>

                    {/* Sales rep */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">
                        {invoice.salesRep?.name || "-"}
                      </p>
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">
                        {invoice.branch?.name || "-"}
                      </p>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/api/invoice/${invoice.id}`}
                          target="_blank"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
                          title="View invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 0 && (
          <div className="flex flex-col gap-3 border-t border-zinc-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Showing{" "}
              <span className="text-zinc-300">
                {(data.pagination.page - 1) * data.pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="text-zinc-300">
                {Math.min(
                  data.pagination.page * data.pagination.limit,
                  data.pagination.total
                )}
              </span>{" "}
              of <span className="text-zinc-300">{data.pagination.total}</span>{" "}
              invoices
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!data.pagination.hasPreviousPage || loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="min-w-[80px] text-center text-sm text-zinc-400">
                Page{" "}
                <span className="font-medium text-white">
                  {data.pagination.page}
                </span>{" "}
                / {data.pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={!data.pagination.hasNextPage || loading}
                onClick={() => setPage((value) => value + 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}