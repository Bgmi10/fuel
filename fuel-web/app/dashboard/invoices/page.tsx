"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

import {
  CalendarDays,
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

  branch: {
    id: string;
    name: string;
  } | null;

  serviceName: string;
  packageName: string;
  packageDurationInDays: number;

  subCategory: {
    id: string;
    name: string;
  } | null;

  intent:
    | "NEW"
    | "EXTEND"
    | "UPGRADE"
    | "TRANSFER_FEE";

  status:
    | "PENDING"
    | "PARTIAL_PAID"
    | "FULLY_PAID"
    | "CANCELLED";

  amount: number;

  packageAmount: number;
  discountAmount: number;
  referralDiscountAmount: number;

  paidAmount: number;
  balanceAmount: number;

  totalTax: number | null;

  groupMemberCount: number | null;
  groupDiscountPercentage: number | null;

  salesRep: {
    id: string;
    name: string;
  } | null;

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
    paymentType:
      | "INITIAL"
      | "BALANCE"
      | "TRANSFER";
    receiptNumber: string;
    paidAt: string;
  } | null;

  createdAt: string;
  updatedAt: string;
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

  filters: {
    paymentModes: string[];
    statuses: string[];
    intents: string[];

    staff: {
      id: string;
      name: string;
    }[];
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

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  PARTIAL_PAID: "Partial Paid",
  FULLY_PAID: "Fully Paid",
  CANCELLED: "Cancelled",
};

const intentLabels: Record<string, string> = {
  NEW: "New",
  EXTEND: "Extend",
  UPGRADE: "Upgrade",
  TRANSFER_FEE: "Transfer Fee",
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
  }).format(new Date(value));
};

const getDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function InvoicesPage() {
  const [data, setData] =
    useState<InvoiceResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [paymentMode, setPaymentMode] =
    useState("");

  const [status, setStatus] = useState("");

  const [intent, setIntent] = useState("");

  const [salesRepId, setSalesRepId] =
    useState("");

  const [branchId, setBranchId] =
    useState("");

  const [page, setPage] = useState(1);

  const [showFilters, setShowFilters] =
    useState(false);

  const [selectedIds, setSelectedIds] =
    useState<Set<string>>(new Set());

  const selectAllRef =
    useRef<HTMLInputElement>(null);

  const buildParams = useCallback(
    (includePagination = true) => {
      const params = new URLSearchParams();

      if (includePagination) {
        params.set("page", String(page));
        params.set("limit", "15");
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (from) {
        params.set("from", from);
      }

      if (to) {
        params.set("to", to);
      }

      if (paymentMode) {
        params.set("paymentMode", paymentMode);
      }

      if (status) {
        params.set("status", status);
      }

      if (intent) {
        params.set("intent", intent);
      }

      if (salesRepId) {
        params.set("salesRepId", salesRepId);
      }

      if (branchId) {
        params.set("branchId", branchId);
      }

      return params;
    },
    [
      page,
      search,
      from,
      to,
      paymentMode,
      status,
      intent,
      salesRepId,
      branchId,
    ]
  );

  const fetchInvoices = useCallback(
    async () => {
      try {
        setLoading(true);

        const params = buildParams(true);

        const response = await fetch(
          `/api/invoices?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch invoice data"
          );
        }

        const result: InvoiceResponse =
          await response.json();

        setData(result);
      } catch (error) {
        console.error(error);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  /**
   * Clear selected rows whenever filters change.
   */
  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    search,
    from,
    to,
    paymentMode,
    status,
    intent,
    salesRepId,
    branchId,
  ]);

  const currentPageIds =
    data?.data.map((item) => item.id) || [];

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) =>
      selectedIds.has(id)
    );

  const someCurrentPageSelected =
    currentPageIds.some((id) =>
      selectedIds.has(id)
    );

  useEffect(() => {
    if (!selectAllRef.current) return;

    selectAllRef.current.indeterminate =
      someCurrentPageSelected &&
      !allCurrentPageSelected;
  }, [
    someCurrentPageSelected,
    allCurrentPageSelected,
  ]);

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
        currentPageIds.forEach((id) =>
          next.delete(id)
        );
      } else {
        currentPageIds.forEach((id) =>
          next.add(id)
        );
      }

      return next;
    });
  };

  /**
   * Fetch all invoices matching current filters.
   */
  const fetchAllFilteredInvoices =
    useCallback(async () => {
      const firstParams = buildParams(false);

      firstParams.set("page", "1");
      firstParams.set("limit", "100");

      const allRecords: Invoice[] = [];

      let currentPage = 1;
      let totalPages = 1;

      while (currentPage <= totalPages) {
        const params = new URLSearchParams(
          firstParams
        );

        params.set(
          "page",
          String(currentPage)
        );

        const response = await fetch(
          `/api/invoices?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch all invoices"
          );
        }

        const result: InvoiceResponse =
          await response.json();

        allRecords.push(...result.data);

        totalPages =
          result.pagination.totalPages;

        currentPage += 1;
      }

      return allRecords;
    }, [buildParams]);

  const selectAllFiltered = async () => {
    try {
      setExporting(true);

      const records =
        await fetchAllFilteredInvoices();

      setSelectedIds(
        new Set(records.map((item) => item.id))
      );
    } catch (error) {
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);

      const records =
        await fetchAllFilteredInvoices();

      const recordsToExport =
        selectedIds.size > 0
          ? records.filter((item) =>
              selectedIds.has(item.id)
            )
          : records;

      if (recordsToExport.length === 0) {
        return;
      }

      const rows = recordsToExport.map(
        (invoice) => ({
          "Invoice Number":
            invoice.invoiceNumber,

          Member: invoice.member.name,

          Phone: invoice.member.phone,

          Age: invoice.member.age ?? "-",

          Service: invoice.serviceName,

          Package: invoice.packageName,

          "Sub Category":
            invoice.subCategory?.name || "-",

          Intent:
            intentLabels[invoice.intent] ||
            invoice.intent,

          "Invoice Date":
            formatDateTime(
              invoice.transactionDate
            ),

          "Membership From":
            invoice.validity
              ? formatDate(
                  invoice.validity.from
                )
              : "-",

          "Membership To":
            invoice.validity
              ? formatDate(
                  invoice.validity.to
                )
              : "-",

          "Payment Mode":
            invoice.payment?.paymentMode ||
            "-",

          "Payment Type":
            invoice.payment
              ? paymentTypeLabels[
                  invoice.payment.paymentType
                ] ||
                invoice.payment.paymentType
              : "-",

          Amount:
            invoice.amount / 100,

          "Paid Amount":
            invoice.paidAmount / 100,

          "Balance Amount":
            invoice.balanceAmount / 100,

          Tax:
            invoice.totalTax
              ? invoice.totalTax / 100
              : 0,

          "Sales Rep":
            invoice.salesRep?.name ||
            "-",

          Branch:
            invoice.branch?.name || "-",

          Status:
            statusLabels[invoice.status] ||
            invoice.status,
        })
      );

      const worksheet =
        XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 18 },
        { wch: 24 },
        { wch: 16 },
        { wch: 10 },
        { wch: 22 },
        { wch: 24 },
        { wch: 22 },
        { wch: 14 },
        { wch: 24 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 22 },
        { wch: 20 },
        { wch: 18 },
      ];

      const summaryRows = [
        {
          Filter: "Search",
          Value: search || "All",
        },
        {
          Filter: "From",
          Value: from || "All",
        },
        {
          Filter: "To",
          Value: to || "All",
        },
        {
          Filter: "Payment Mode",
          Value: paymentMode || "All",
        },
        {
          Filter: "Status",
          Value:
            statusLabels[status] ||
            status ||
            "All",
        },
        {
          Filter: "Intent",
          Value:
            intentLabels[intent] ||
            intent ||
            "All",
        },
        {
          Filter: "Sales Rep",
          Value:
            data?.filters.staff.find(
              (staff) =>
                staff.id === salesRepId
            )?.name || "All",
        },
        {
          Filter: "Branch",
          Value:
            data?.branches.find(
              (branch) =>
                branch.id === branchId
            )?.name || "All",
        },
        {
          Filter: "Records Exported",
          Value: recordsToExport.length,
        },
        {
          Filter: "Total Amount",
          Value:
            recordsToExport.reduce(
              (total, item) =>
                total + item.amount,
              0
            ) / 100,
        },
        {
          Filter: "Total Paid",
          Value:
            recordsToExport.reduce(
              (total, item) =>
                total + item.paidAmount,
              0
            ) / 100,
        },
        {
          Filter: "Total Balance",
          Value:
            recordsToExport.reduce(
              (total, item) =>
                total + item.balanceAmount,
              0
            ) / 100,
        },
      ];

      const summarySheet =
        XLSX.utils.json_to_sheet(
          summaryRows
        );

      summarySheet["!cols"] = [
        { wch: 24 },
        { wch: 40 },
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Invoices"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Summary"
      );

      const filename = `invoices-${getDateInputValue(
        new Date()
      )}.xlsx`;

      XLSX.writeFile(
        workbook,
        filename
      );
    } catch (error) {
      console.error(
        "Invoice export failed:",
        error
      );
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFrom("");
    setTo("");
    setPaymentMode("");
    setStatus("");
    setIntent("");
    setSalesRepId("");
    setBranchId("");
    setPage(1);
  };

  const hasFilters =
    Boolean(search) ||
    Boolean(from) ||
    Boolean(to) ||
    Boolean(paymentMode) ||
    Boolean(status) ||
    Boolean(intent) ||
    Boolean(salesRepId) ||
    Boolean(branchId);

  const totalAmount =
    data?.summary.totalAmount || 0;

  const totalPaid =
    data?.summary.totalPaid || 0;

  const totalBalance =
    data?.summary.totalBalance || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Invoices
          </h1>

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
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            disabled={
              exporting || loading
            }
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

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                Total Invoices
              </p>

              <p className="mt-2 text-2xl font-semibold text-white">
                {data?.summary.totalCount || 0}
              </p>
            </div>

            <div className="rounded-lg bg-zinc-900 p-3">
              <FileText className="h-5 w-5 text-lime-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                Total Invoiced
              </p>

              <p className="mt-2 text-2xl font-semibold text-white">
                {formatCurrency(totalAmount)}
              </p>
            </div>

            <div className="rounded-lg bg-zinc-900 p-3">
              <IndianRupee className="h-5 w-5 text-lime-400" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">
                Outstanding
              </p>

              <p className="mt-2 text-2xl font-semibold text-white">
                {formatCurrency(totalBalance)}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Paid: {formatCurrency(totalPaid)}
              </p>
            </div>

            <div className="rounded-lg bg-zinc-900 p-3">
              <IndianRupee className="h-5 w-5 text-lime-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by member, phone or invoice number"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-lime-400"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setShowFilters((value) => !value)
            }
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
                •
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-zinc-800 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {/* From */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  From
                </label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="date"
                    value={from}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              {/* To */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  To
                </label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                  <input
                    type="date"
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Payment Mode
                </label>

                <select
                  value={paymentMode}
                  onChange={(event) => {
                    setPaymentMode(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
                >
                  <option value="">
                    All payment modes
                  </option>

                  {data?.filters.paymentModes.map(
                    (mode) => (
                      <option
                        key={mode}
                        value={mode}
                      >
                        {mode}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
                >
                  <option value="">
                    All statuses
                  </option>

                  {data?.filters.statuses.map(
                    (value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {statusLabels[value] ||
                          value}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Intent */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Intent
                </label>

                <select
                  value={intent}
                  onChange={(event) => {
                    setIntent(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
                >
                  <option value="">
                    All intents
                  </option>

                  {data?.filters.intents.map(
                    (value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {intentLabels[value] ||
                          value}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Sales Rep */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Sales Rep
                </label>

                <select
                  value={salesRepId}
                  onChange={(event) => {
                    setSalesRepId(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
                >
                  <option value="">
                    All sales reps
                  </option>

                  {data?.filters.staff.map(
                    (staff) => (
                      <option
                        key={staff.id}
                        value={staff.id}
                      >
                        {staff.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Branch */}
              {data?.scope.canSelectBranch && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Branch
                  </label>

                  <select
                    value={branchId}
                    onChange={(event) => {
                      setBranchId(
                        event.target.value
                      );
                      setPage(1);
                    }}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lime-400"
                  >
                    <option value="">
                      All branches
                    </option>

                    {data.branches.map(
                      (branch) => (
                        <option
                          key={branch.id}
                          value={branch.id}
                        >
                          {branch.name}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}
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
          <table className="w-full min-w-[1450px] text-left">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={
                      allCurrentPageSelected
                    }
                    onChange={
                      toggleCurrentPage
                    }
                    disabled={
                      data?.data.length === 0
                    }
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-lime-400"
                  />
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Member
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Invoice
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Membership
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Validity
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Transaction
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Payment
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Amount
                </th>

                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Sales Rep
                </th>

                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-16 text-center text-sm text-zinc-500"
                  >
                    Loading invoices...
                  </td>
                </tr>
              ) : !data ||
                data.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 text-zinc-700" />

                      <p className="mt-3 text-sm font-medium text-zinc-400">
                        No invoices found
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        Try changing your filters or
                        search.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.data.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={`transition hover:bg-zinc-900/40 ${
                      selectedIds.has(
                        invoice.id
                      )
                        ? "bg-lime-400/[0.03]"
                        : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(
                          invoice.id
                        )}
                        onChange={() =>
                          toggleSelection(
                            invoice.id
                          )
                        }
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
                            {invoice.member.age !=
                              null &&
                              ` • ${invoice.member.age} yrs`}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Invoice */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-zinc-200">
                          {invoice.invoiceNumber}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {intentLabels[
                            invoice.intent
                          ] ||
                            invoice.intent}
                        </p>
                      </div>
                    </td>

                    {/* Membership */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-200">
                        {invoice.packageName}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {invoice.serviceName}

                        {invoice.subCategory &&
                          ` • ${invoice.subCategory.name}`}
                      </p>
                    </td>

                    {/* Validity */}
                    <td className="px-4 py-4">
                      {invoice.validity ? (
                        <div>
                          <p className="text-sm text-zinc-200">
                            {formatDate(
                              invoice.validity.from
                            )}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            to{" "}
                            {formatDate(
                              invoice.validity.to
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-600">
                          -
                        </span>
                      )}
                    </td>

                    {/* Transaction */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-zinc-200">
                          {formatDateTime(
                            invoice.transactionDate
                          )}
                        </p>

                        <span
                          className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs ${
                            invoice.status ===
                            "FULLY_PAID"
                              ? "bg-lime-400/10 text-lime-400"
                              : invoice.status ===
                                  "PARTIAL_PAID"
                                ? "bg-yellow-400/10 text-yellow-400"
                                : invoice.status ===
                                    "CANCELLED"
                                  ? "bg-red-400/10 text-red-400"
                                  : "bg-zinc-900 text-zinc-400"
                          }`}
                        >
                          {statusLabels[
                            invoice.status
                          ] ||
                            invoice.status}
                        </span>
                      </div>
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-4">
                      {invoice.payment ? (
                        <div>
                          <span className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                            {
                              invoice.payment
                                .paymentMode
                            }
                          </span>

                          <p className="mt-1 text-xs text-zinc-500">
                            {paymentTypeLabels[
                              invoice.payment
                                .paymentType
                            ] ||
                              invoice.payment
                                .paymentType}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-600">
                          Unpaid
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4">
                      <p className="font-semibold text-lime-400">
                        {formatCurrency(
                          invoice.amount
                        )}
                      </p>

                      {invoice.balanceAmount >
                        0 && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Balance:{" "}
                          {formatCurrency(
                            invoice.balanceAmount
                          )}
                        </p>
                      )}
                    </td>

                    {/* Sales rep */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">
                        {invoice.salesRep?.name ||
                          "-"}
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
        {data &&
          data.pagination.totalPages > 0 && (
            <div className="flex flex-col gap-3 border-t border-zinc-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-500">
                Showing{" "}
                <span className="text-zinc-300">
                  {(data.pagination.page - 1) *
                    data.pagination.limit +
                    1}
                </span>{" "}
                to{" "}
                <span className="text-zinc-300">
                  {Math.min(
                    data.pagination.page *
                      data.pagination.limit,
                    data.pagination.total
                  )}
                </span>{" "}
                of{" "}
                <span className="text-zinc-300">
                  {data.pagination.total}
                </span>{" "}
                invoices
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    !data.pagination
                      .hasPreviousPage ||
                    loading
                  }
                  onClick={() =>
                    setPage((value) =>
                      Math.max(1, value - 1)
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="min-w-[80px] text-center text-sm text-zinc-400">
                  Page{" "}
                  <span className="font-medium text-white">
                    {data.pagination.page}
                  </span>{" "}
                  /{" "}
                  {data.pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    !data.pagination.hasNextPage ||
                    loading
                  }
                  onClick={() =>
                    setPage((value) =>
                      value + 1
                    )
                  }
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
