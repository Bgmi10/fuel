"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
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

type Collection = {
  id: string;
  receiptNumber: string | null;
  amount: number;
  paymentMode: string;
  paymentType: "INITIAL" | "BALANCE" | "TRANSFER";
  status: string;
  paidAt: string | null;
  createdAt: string;

  member: {
    id: string;
    name: string;
    phone: string;
  };

  invoice: {
    id: string;
    invoiceNumber: string;
    serviceName: string | null;
    packageName: string | null;
    intent: string;
    totalTax: number | null;
    subCategory: {
      id: string;
      name: string;
    } | null;
    salesRep: {
      id: string;
      name: string;
    } | null;
  };

  branch: {
    id: string;
    name: string;
  } | null;
};

type PeriodStat = {
  count: number;
  amount: number;
};

type CollectionResponse = {
  data: Collection[];

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
  };

  periodStats: {
    today: PeriodStat;
    month: PeriodStat;
    year: PeriodStat;
  };

  filters: {
    paymentModes: string[];
    paymentTypes: string[];
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

  branches: {
    id: string;
    name: string;
  }[];
};

type Period = "today" | "month" | "year" | "all";

type Filters = {
  search: string;
  from: string;
  to: string;
  paymentMode: string;
  paymentType: string;
  intent: string;
  collectedBy: string;
  branchId: string;
  serviceId: string;
  subCategoryId: string;
  packageId: string;
  minAmount: string;
  maxAmount: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  from: "",
  to: "",
  paymentMode: "",
  paymentType: "",
  intent: "",
  collectedBy: "",
  branchId: "",
  serviceId: "",
  subCategoryId: "",
  packageId: "",
  minAmount: "",
  maxAmount: "",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const paymentTypeLabels: Record<string, string> = {
  INITIAL: "Initial",
  BALANCE: "Balance",
  TRANSFER: "Transfer",
};

const intentLabels: Record<string, string> = {
  NEW: "New",
  EXTEND: "Extend",
  UPGRADE: "Upgrade",
  TRANSFER_FEE: "Transfer Fee",
};

const periodLabels: Record<Period, string> = {
  today: "Today",
  month: "This Month",
  year: "This Year",
  all: "All Time",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount / 100);
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

const labelClass = "mb-2 block text-xs font-medium text-zinc-400";

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
            className={`text-sm ${
              active ? "text-lime-400" : "text-zinc-400"
            }`}
          >
            {title}
          </p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {formatCurrency(stat?.amount || 0)}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {stat?.count || 0} collection
            {stat?.count === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-lg bg-zinc-900 p-3 text-lime-400">
          {icon}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CollectionPage() {
  const [data, setData] = useState<CollectionResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [period, setPeriod] = useState<Period>("today");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  // Search box is debounced so we don't hit the API on every keystroke.
  const [searchInput, setSearchInput] = useState("");

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectAllRef = useRef<HTMLInputElement>(null);

  /**
   * Update one or more filters.
   * Always resets to page 1 and clears selection, so an admin can't
   * select rows under one filter and export them under another.
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
   * Switching period clears any manual date range, because the
   * manual range always wins on the server.
   */
  const changePeriod = (next: Period) => {
    setPeriod(next);
    setFilters((previous) => ({ ...previous, from: "", to: "" }));
    setPage(1);
    setSelectedIds(new Set());
  };

  /**
   * Build API query parameters.
   */
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

  /**
   * Fetch current page.
   */
  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);

      const params = buildParams(true);

      const response = await fetch(`/api/collection?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch collection data");
      }

      const result: CollectionResponse = await response.json();

      setData(result);
    } catch (error) {
      console.error(error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  /**
   * Current page selection state.
   */
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
   * Fetch every filtered record (API max limit is 100 per page).
   */
  const fetchAllFilteredCollections = useCallback(async () => {
    const baseParams = buildParams(false);

    baseParams.set("limit", "100");

    const allRecords: Collection[] = [];

    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages) {
      const params = new URLSearchParams(baseParams);

      params.set("page", String(currentPage));

      const response = await fetch(`/api/collection?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch all collection records");
      }

      const result: CollectionResponse = await response.json();

      allRecords.push(...result.data);

      totalPages = result.pagination.totalPages;
      currentPage += 1;
    }

    return allRecords;
  }, [buildParams]);

  const selectAllFiltered = async () => {
    try {
      setExporting(true);

      const records = await fetchAllFilteredCollections();

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

  /**
   * Export selected records. If nothing is selected,
   * export every record matching the current filters.
   */
  const exportToExcel = async () => {
    try {
      setExporting(true);

      const records = await fetchAllFilteredCollections();

      const recordsToExport =
        selectedIds.size > 0
          ? records.filter((item) => selectedIds.has(item.id))
          : records;

      if (recordsToExport.length === 0) {
        return;
      }

      const rows = recordsToExport.map((collection) => ({
        "Receipt Number": collection.receiptNumber || "-",
        "Invoice Number": collection.invoice.invoiceNumber,
        Member: collection.member.name,
        Phone: collection.member.phone,
        Service: collection.invoice.serviceName || "-",
        Subcategory: collection.invoice.subCategory?.name || "-",
        Package: collection.invoice.packageName || "-",
        Intent:
          intentLabels[collection.invoice.intent] || collection.invoice.intent,
        "Collection Date": formatDateTime(collection.paidAt),
        "Payment Method": collection.paymentMode,
        "Payment Type":
          paymentTypeLabels[collection.paymentType] || collection.paymentType,
        Amount: collection.amount / 100,
        "Collected By": collection.invoice.salesRep?.name || "-",
        Branch: collection.branch?.name || "-",
        Status: collection.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 18 }, // Receipt
        { wch: 18 }, // Invoice
        { wch: 24 }, // Member
        { wch: 16 }, // Phone
        { wch: 22 }, // Service
        { wch: 22 }, // Subcategory
        { wch: 22 }, // Package
        { wch: 14 }, // Intent
        { wch: 24 }, // Date
        { wch: 18 }, // Method
        { wch: 14 }, // Type
        { wch: 14 }, // Amount
        { wch: 22 }, // Collected by
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
        { Filter: "From", Value: filters.from || "All" },
        { Filter: "To", Value: filters.to || "All" },
        { Filter: "Service", Value: nameOf(data?.filters.services, filters.serviceId) },
        {
          Filter: "Subcategory",
          Value: nameOf(data?.filters.subCategories, filters.subCategoryId),
        },
        { Filter: "Package", Value: nameOf(data?.filters.packages, filters.packageId) },
        {
          Filter: "Intent",
          Value: filters.intent
            ? intentLabels[filters.intent] || filters.intent
            : "All",
        },
        { Filter: "Payment Method", Value: filters.paymentMode || "All" },
        {
          Filter: "Payment Type",
          Value: filters.paymentType
            ? paymentTypeLabels[filters.paymentType] || filters.paymentType
            : "All",
        },
        { Filter: "Collected By", Value: nameOf(data?.filters.staff, filters.collectedBy) },
        { Filter: "Branch", Value: nameOf(data?.branches, filters.branchId) },
        { Filter: "Min Amount", Value: filters.minAmount || "-" },
        { Filter: "Max Amount", Value: filters.maxAmount || "-" },
        { Filter: "Records Exported", Value: recordsToExport.length },
        {
          Filter: "Total Collection",
          Value:
            recordsToExport.reduce((total, item) => total + item.amount, 0) /
            100,
        },
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

      summarySheet["!cols"] = [{ wch: 24 }, { wch: 40 }];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Collections");
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      XLSX.writeFile(
        workbook,
        `collections-${getDateInputValue(new Date())}.xlsx`
      );
    } catch (error) {
      console.error("Collection export failed:", error);
    } finally {
      setExporting(false);
    }
  };

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

  // Sub-options narrowed by the currently chosen service
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
          <h1 className="text-2xl font-semibold text-white">Collection</h1>

          <p className="mt-1 text-sm text-zinc-400">
            Track and manage membership payments and collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCollections}
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PeriodCard
          title="Today"
          icon={<Clock className="h-5 w-5" />}
          stat={data?.periodStats.today}
          active={!hasCustomRange && period === "today"}
          onClick={() => changePeriod("today")}
        />

        <PeriodCard
          title="This Month"
          icon={<CalendarDays className="h-5 w-5" />}
          stat={data?.periodStats.month}
          active={!hasCustomRange && period === "month"}
          onClick={() => changePeriod("month")}
        />

        <PeriodCard
          title="This Year"
          icon={<CalendarRange className="h-5 w-5" />}
          stat={data?.periodStats.year}
          active={!hasCustomRange && period === "year"}
          onClick={() => changePeriod("year")}
        />
      </div>

      {/* Tabs + current selection summary */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "month", "year", "all"] as Period[]).map((tab) => {
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
                {periodLabels[tab]}
              </button>
            );
          })}

          {hasCustomRange && (
            <span className="rounded-lg border border-lime-400/40 bg-lime-400/10 px-3.5 py-2 text-sm font-medium text-lime-400">
              Custom range
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-lime-400" />
            <span className="text-sm text-zinc-400">
              {activeLabel}:{" "}
              <span className="font-semibold text-white">
                {data?.summary.totalCount || 0}
              </span>{" "}
              collections
            </span>
          </div>

          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-lime-400" />
            <span className="text-sm font-semibold text-white">
              {formatCurrency(data?.summary.totalAmount || 0)}
            </span>
          </div>
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
              placeholder="Search by member name, phone, receipt or invoice number"
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
              {/* From */}
              <div>
                <label className={labelClass}>From</label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="date"
                    value={filters.from}
                    max={filters.to || undefined}
                    onChange={(event) =>
                      updateFilters({ from: event.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              {/* To */}
              <div>
                <label className={labelClass}>To</label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="date"
                    value={filters.to}
                    min={filters.from || undefined}
                    onChange={(event) =>
                      updateFilters({ to: event.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400"
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

              {/* Package */}
              <div>
                <label className={labelClass}>Package</label>

                <select
                  value={filters.packageId}
                  onChange={(event) =>
                    updateFilters({ packageId: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All packages</option>

                  {packageOptions.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Intent */}
              <div>
                <label className={labelClass}>Membership Intent</label>

                <select
                  value={filters.intent}
                  onChange={(event) =>
                    updateFilters({ intent: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All intents</option>

                  {data?.filters.intents.map((intent) => (
                    <option key={intent} value={intent}>
                      {intentLabels[intent] || intent}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className={labelClass}>Payment Method</label>

                <select
                  value={filters.paymentMode}
                  onChange={(event) =>
                    updateFilters({ paymentMode: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All payment methods</option>

                  {data?.filters.paymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Type */}
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

              {/* Collected By */}
              <div>
                <label className={labelClass}>Collected By</label>

                <select
                  value={filters.collectedBy}
                  onChange={(event) =>
                    updateFilters({ collectedBy: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">All staff</option>

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
                        collectedBy: "", // staff list depends on branch
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
          <table className="w-full min-w-[1500px] text-left">
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

                {[
                  "Member",
                  "Contact",
                  "Transaction",
                  "Service",
                  "Subcategory",
                  "Membership",
                  "Branch",
                  "Payment",
                  "Amount",
                  "Collected By",
                ].map((heading) => (
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
                    colSpan={12}
                    className="px-4 py-16 text-center text-sm text-zinc-500"
                  >
                    Loading collections...
                  </td>
                </tr>
              ) : !data || data.data.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 text-zinc-700" />

                      <p className="mt-3 text-sm font-medium text-zinc-400">
                        No collections found
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        Try changing the period, filters or search.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.data.map((collection) => (
                  <tr
                    key={collection.id}
                    className={`transition hover:bg-zinc-900/40 ${
                      selectedIds.has(collection.id)
                        ? "bg-lime-400/[0.03]"
                        : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(collection.id)}
                        onChange={() => toggleSelection(collection.id)}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-lime-400"
                      />
                    </td>

                    {/* Member */}
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/members/${collection.member.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900">
                          <User className="h-4 w-4 text-zinc-500" />
                        </div>

                        <div>
                          <p className="font-medium text-white hover:text-lime-400">
                            {collection.member.name}
                          </p>

                          <p className="mt-0.5 text-xs text-zinc-500">
                            {collection.invoice.invoiceNumber}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">
                        {collection.member.phone}
                      </p>
                    </td>

                    {/* Transaction */}
                    <td className="px-4 py-4">
                      <p className="font-medium text-zinc-200">
                        {collection.receiptNumber || "-"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDateTime(collection.paidAt)}
                      </p>
                    </td>

                    {/* Service */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-200">
                        {collection.invoice.serviceName || "-"}
                      </p>
                    </td>

                    {/* Subcategory */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">
                        {collection.invoice.subCategory?.name || "-"}
                      </p>
                    </td>

                    {/* Membership */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-200">
                        {collection.invoice.packageName || "-"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {intentLabels[collection.invoice.intent] ||
                          collection.invoice.intent}
                      </p>
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">
                        {collection.branch?.name || "-"}
                      </p>
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                        {collection.paymentMode}
                      </span>

                      <p className="mt-1 text-xs text-zinc-500">
                        {paymentTypeLabels[collection.paymentType] ||
                          collection.paymentType}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4">
                      <p className="font-semibold text-lime-400">
                        {formatCurrency(collection.amount)}
                      </p>
                    </td>

                    {/* Collected By */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">
                        {collection.invoice.salesRep?.name || "-"}
                      </p>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/api/receipt/${collection.id}`}
                          target="_blank"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
                          title="View receipt"
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
              collections
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