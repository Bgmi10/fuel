"use client";

import {
  Calendar,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  Download,
  Edit3,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  TrendingUp,
  User,
  X,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

/* ============================================================
   TYPES
============================================================ */

const EXPENSE_TYPES = [
  "RENT",
  "UTILITIES",
  "SALARY",
  "EQUIPMENT",
  "MAINTENANCE",
  "MARKETING",
  "SUPPLIES",
  "INSURANCE",
  "TAXES",
  "OTHER",
] as const;

type ExpenseType = (typeof EXPENSE_TYPES)[number];

const expenseTypeLabels: Record<ExpenseType, string> = {
  RENT: "Rent",
  UTILITIES: "Utilities",
  SALARY: "Salary",
  EQUIPMENT: "Equipment",
  MAINTENANCE: "Maintenance",
  MARKETING: "Marketing",
  SUPPLIES: "Supplies",
  INSURANCE: "Insurance",
  TAXES: "Taxes",
  OTHER: "Other",
};

type Expense = {
  id: string;
  description: string | null;
  expenseType: ExpenseType | null;
  date: string | null;
  amount: number | null;
  byUserId: string;
  createdAt: string;
  updatedAt: string;

  byUser?: {
    id: string;
    name: string | null;
  } | null;
};

type Period = "all" | "month" | "year";

type Filters = {
  search: string;
  type: string;
  userId: string;
  from: string;
  to: string;
  minAmount: string;
  maxAmount: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  type: "",
  userId: "",
  from: "",
  to: "",
  minAmount: "",
  maxAmount: "",
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/* ============================================================
   HELPERS
============================================================ */

const formatCurrency = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);

/**
 * Expense dates are stored as UTC midnight ("YYYY-MM-DDT00:00:00.000Z"),
 * so the calendar date is always read in UTC. This keeps the date the
 * same for every viewer, whatever their timezone.
 */
const toDateKey = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const formatDate = (value: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getUserName = (expense: Expense) =>
  expense.byUser?.name?.trim() || "Unknown User";

const getType = (expense: Expense): ExpenseType =>
  expense.expenseType && expense.expenseType in expenseTypeLabels
    ? expense.expenseType
    : "OTHER";

const inputClass =
  "h-11 w-full rounded-xl border border-neutral-800 bg-black px-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-400";

const labelClass =
  "mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500";

/* ============================================================
   PAGE
============================================================ */

export default function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [error, setError] = useState("");

  /* ---------- filters ---------- */

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [period, setPeriod] = useState<Period>("all");

  /* ---------- selection ---------- */

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ---------- modal ---------- */

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [description, setDescription] = useState("");
  const [expenseType, setExpenseType] = useState<ExpenseType>("OTHER");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  /* ============================================================
     CURRENT PERIOD KEYS (local "today")
  ============================================================ */

  const currentKeys = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();

    return {
      year,
      monthIndex,
      yearKey: String(year),
      monthKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    };
  }, []);

  /* ============================================================
     FETCH
  ============================================================ */

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/expenses", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Failed to load expenses"
        );
      }

      const expenseList = Array.isArray(result)
        ? result
        : Array.isArray(result?.expenses)
          ? result.expenses
          : [];

      setExpenses(expenseList);
    } catch (requestError) {
      console.error("Failed to load expenses:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load expenses"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  /* ============================================================
     FILTER HELPERS
  ============================================================ */

  /**
   * Any filter change clears the selection, so rows selected under
   * one filter can't be exported under another.
   */
  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
    setSelectedIds(new Set());
  };

  const changePeriod = (next: Period) => {
    // Clicking the active card again goes back to "all".
    setPeriod((current) => (current === next ? "all" : next));
    setFilters((previous) => ({ ...previous, from: "", to: "" }));
    setSelectedIds(new Set());
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPeriod("all");
    setSelectedIds(new Set());
  };

  const hasCustomRange = Boolean(filters.from || filters.to);

  const activeFilterCount =
    (Object.keys(filters) as (keyof Filters)[]).filter((key) =>
      Boolean(filters[key])
    ).length + (period !== "all" && !hasCustomRange ? 1 : 0);

  const hasFilters = activeFilterCount > 0;

  /* ============================================================
     FILTERED DATA
  ============================================================ */

  const userOptions = useMemo(() => {
    const map = new Map<string, string>();

    expenses.forEach((expense) => {
      map.set(expense.byUserId, getUserName(expense));
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [expenses]);

  /**
   * Every filter EXCEPT the date. The "This Month" / "This Year"
   * cards and the monthly chart use this, so they react to type,
   * user, amount and search but never to the selected date period.
   */
  const baseFiltered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    const minNumber =
      filters.minAmount !== "" ? Number(filters.minAmount) : NaN;
    const maxNumber =
      filters.maxAmount !== "" ? Number(filters.maxAmount) : NaN;

    const min = Number.isFinite(minNumber) ? Math.round(minNumber * 100) : null;
    const max = Number.isFinite(maxNumber) ? Math.round(maxNumber * 100) : null;

    return expenses.filter((expense) => {
      const type = getType(expense);
      const paise = expense.amount || 0;

      if (query) {
        const fields = [
          expense.description || "",
          getUserName(expense),
          expenseTypeLabels[type],
          (paise / 100).toFixed(2),
          String(expense.amount ?? ""),
        ];

        if (!fields.some((field) => field.toLowerCase().includes(query))) {
          return false;
        }
      }

      if (filters.type && type !== filters.type) return false;
      if (filters.userId && expense.byUserId !== filters.userId) return false;
      if (min !== null && paise < min) return false;
      if (max !== null && paise > max) return false;

      return true;
    });
  }, [expenses, filters]);

  /**
   * The list: base filters plus the date range / period tab.
   * A manual From/To range wins over the period tab.
   */
  const filteredExpenses = useMemo(() => {
    return baseFiltered.filter((expense) => {
      const key = toDateKey(expense.date);

      if (hasCustomRange) {
        if (!key) return false;
        if (filters.from && key < filters.from) return false;
        if (filters.to && key > filters.to) return false;
        return true;
      }

      if (period === "month") return key.startsWith(currentKeys.monthKey);
      if (period === "year") return key.startsWith(currentKeys.yearKey);

      return true;
    });
  }, [baseFiltered, hasCustomRange, filters.from, filters.to, period, currentKeys]);

  /* ============================================================
     SUMMARY, CHARTS
  ============================================================ */

  const summary = useMemo(() => {
    let monthTotal = 0;
    let monthCount = 0;
    let yearTotal = 0;
    let yearCount = 0;

    const monthly = new Array(12).fill(0) as number[];

    baseFiltered.forEach((expense) => {
      const key = toDateKey(expense.date);
      if (!key) return;

      const paise = expense.amount || 0;

      if (key.startsWith(currentKeys.yearKey)) {
        yearTotal += paise;
        yearCount += 1;

        const monthIndex = Number(key.slice(5, 7)) - 1;
        if (monthIndex >= 0 && monthIndex < 12) monthly[monthIndex] += paise;
      }

      if (key.startsWith(currentKeys.monthKey)) {
        monthTotal += paise;
        monthCount += 1;
      }
    });

    const viewTotal = filteredExpenses.reduce(
      (total, expense) => total + (expense.amount || 0),
      0
    );

    return {
      monthTotal,
      monthCount,
      yearTotal,
      yearCount,
      monthly,
      viewTotal,
      viewCount: filteredExpenses.length,
      averagePerExpense:
        filteredExpenses.length > 0
          ? Math.round(viewTotal / filteredExpenses.length)
          : 0,
      averagePerMonth: Math.round(yearTotal / (currentKeys.monthIndex + 1)),
    };
  }, [baseFiltered, filteredExpenses, currentKeys]);

  const typeBreakdown = useMemo(() => {
    const totals = new Map<ExpenseType, number>();

    filteredExpenses.forEach((expense) => {
      const type = getType(expense);
      totals.set(type, (totals.get(type) || 0) + (expense.amount || 0));
    });

    const total = Array.from(totals.values()).reduce((a, b) => a + b, 0);

    return Array.from(totals.entries())
      .map(([type, paise]) => ({
        type,
        paise,
        percent: total > 0 ? (paise / total) * 100 : 0,
      }))
      .sort((a, b) => b.paise - a.paise);
  }, [filteredExpenses]);

  const maxMonthly = Math.max(1, ...summary.monthly);

  /* ============================================================
     SELECTION
  ============================================================ */

  const selectedExpenses = useMemo(
    () => filteredExpenses.filter((expense) => selectedIds.has(expense.id)),
    [filteredExpenses, selectedIds]
  );

  const allFilteredSelected =
    filteredExpenses.length > 0 &&
    filteredExpenses.every((expense) => selectedIds.has(expense.id));

  const toggleExpenseSelection = (id: string) => {
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

  const toggleSelectAllFiltered = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (allFilteredSelected) {
        filteredExpenses.forEach((expense) => next.delete(expense.id));
      } else {
        filteredExpenses.forEach((expense) => next.add(expense.id));
      }

      return next;
    });
  };

  /* ============================================================
     EXPORT
  ============================================================ */

  const handleExportExcel = () => {
    const recordsToExport =
      selectedExpenses.length > 0 ? selectedExpenses : filteredExpenses;

    if (recordsToExport.length === 0) {
      setError("There are no expenses to export.");
      return;
    }

    setExporting(true);
    setError("");

    try {
      const exportRows = recordsToExport.map((expense, index) => ({
        "S.No": index + 1,
        Description: expense.description || "Untitled expense",
        "Type of Expense": expenseTypeLabels[getType(expense)],
        "By User": getUserName(expense),
        Date: expense.date ? formatDate(expense.date) : "",
        "Amount (₹)": Number(((expense.amount || 0) / 100).toFixed(2)),
        "Amount (Paise)": expense.amount || 0,
        "Expense ID": expense.id,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 32 },
        { wch: 18 },
        { wch: 24 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 32 },
      ];

      worksheet["!autofilter"] = {
        ref: `A1:H${exportRows.length + 1}`,
      };

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

      const periodLabel = hasCustomRange
        ? "Custom range"
        : period === "month"
          ? "This Month"
          : period === "year"
            ? "This Year"
            : "All Time";

      const summaryRows = [
        {
          "Exported At": new Date().toLocaleString("en-IN"),
          "Records Exported": recordsToExport.length,
          Period: periodLabel,
          Search: filters.search || "All",
          "Type of Expense": filters.type
            ? expenseTypeLabels[filters.type as ExpenseType] || filters.type
            : "All",
          "By User":
            userOptions.find((user) => user.id === filters.userId)?.name ||
            "All",
          "From Date": filters.from || "All",
          "To Date": filters.to || "All",
          "Min Amount (₹)": filters.minAmount || "-",
          "Max Amount (₹)": filters.maxAmount || "-",
          Selection:
            selectedExpenses.length > 0
              ? "Selected entries"
              : "All filtered entries",
          "Total Amount (₹)": Number(
            (
              recordsToExport.reduce(
                (sum, expense) => sum + (expense.amount || 0),
                0
              ) / 100
            ).toFixed(2)
          ),
        },
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

      summarySheet["!cols"] = new Array(12).fill({ wch: 20 });

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Export Summary");

      const now = new Date();

      const timestamp =
        `${now.getFullYear()}-` +
        `${String(now.getMonth() + 1).padStart(2, "0")}-` +
        `${String(now.getDate()).padStart(2, "0")}_` +
        `${String(now.getHours()).padStart(2, "0")}-` +
        `${String(now.getMinutes()).padStart(2, "0")}`;

      XLSX.writeFile(workbook, `expenses_${timestamp}.xlsx`);
    } catch (exportError) {
      console.error("Failed to export expenses:", exportError);
      setError("Failed to export expenses.");
    } finally {
      setExporting(false);
    }
  };

  /* ============================================================
     MODAL
  ============================================================ */

  const openCreateModal = () => {
    setEditingExpense(null);

    setDescription("");
    setExpenseType("OTHER");
    setAmount("");

    const now = new Date();
    setDate(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(now.getDate()).padStart(2, "0")}`
    );

    setError("");
    setShowModal(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);

    setDescription(expense.description || "");
    setExpenseType(getType(expense));

    // API amount is paise: 50050 -> ₹500.50
    setAmount(expense.amount != null ? String(expense.amount / 100) : "");

    setDate(toDateKey(expense.date));

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingExpense(null);

    setDescription("");
    setExpenseType("OTHER");
    setAmount("");
    setDate("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const trimmedDescription = description.trim();
    const numericAmount = Number(amount);

    if (!trimmedDescription) {
      setError("Please enter an expense description.");
      return;
    }

    if (!expenseType) {
      setError("Please select the type of expense.");
      return;
    }

    if (!amount || !Number.isFinite(numericAmount)) {
      setError("Please enter a valid amount.");
      return;
    }

    if (numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    // UI: ₹500.50  ->  API: 50050 paise
    const amountInPaise = Math.round(numericAmount * 100);

    if (amountInPaise <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingExpense);

      const response = await fetch(
        isEditing ? `/api/expenses/${editingExpense!.id}` : "/api/expenses",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: trimmedDescription,
            expenseType,
            amount: amountInPaise,
            date: date || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            `Failed to ${isEditing ? "update" : "create"} expense`
        );
      }

      closeModal();

      await fetchExpenses();
    } catch (requestError) {
      console.error("Failed to save expense:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to save expense"
      );
    } finally {
      setSaving(false);
    }
  };

  /* ============================================================
     DELETE
  ============================================================ */

  const handleDelete = async (expense: Expense) => {
    const confirmed = window.confirm(
      `Delete this expense?\n\n${expense.description || "Expense"}\n${formatCurrency(
        expense.amount || 0
      )}`
    );

    if (!confirmed) return;

    setDeletingId(expense.id);
    setError("");

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Failed to delete expense"
        );
      }

      setExpenses((current) =>
        current.filter((item) => item.id !== expense.id)
      );

      setSelectedIds((previous) => {
        const next = new Set(previous);
        next.delete(expense.id);
        return next;
      });
    } catch (requestError) {
      console.error("Failed to delete expense:", requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete expense"
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-lime-500/20 bg-lime-500/10">
              <CircleDollarSign size={22} className="text-lime-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">Expenses</h1>

              <p className="mt-1 text-sm text-neutral-500">
                Track and manage gym expenses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchExpenses}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-sm text-neutral-300 transition hover:border-lime-400/50 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime-400 px-4 text-sm font-semibold text-black transition hover:bg-lime-300"
            >
              <Plus size={17} />
              Add Expense
            </button>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-300 transition hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* SUMMARY CARDS (This Month / This Year act as tabs) */}

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          {/* This Month */}
          <button
            type="button"
            onClick={() => changePeriod("month")}
            className={`rounded-2xl border p-5 text-left transition ${
              !hasCustomRange && period === "month"
                ? "border-lime-400/60 bg-lime-500/10"
                : "border-lime-500/20 bg-lime-500/5 hover:border-lime-400/40"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                  This Month&apos;s Expenses
                </p>

                <p className="mt-3 text-3xl font-bold text-white">
                  {formatCurrency(summary.monthTotal)}
                </p>

                <p className="mt-2 text-xs text-neutral-500">
                  {summary.monthCount} expense
                  {summary.monthCount === 1 ? "" : "s"} · click to filter
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/30">
                <CalendarDays size={21} className="text-lime-400" />
              </div>
            </div>
          </button>

          {/* This Year */}
          <button
            type="button"
            onClick={() => changePeriod("year")}
            className={`rounded-2xl border p-5 text-left transition ${
              !hasCustomRange && period === "year"
                ? "border-cyan-400/60 bg-cyan-500/10"
                : "border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-400/40"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Annual Expenses ({currentKeys.year})
                </p>

                <p className="mt-3 text-3xl font-bold text-white">
                  {formatCurrency(summary.yearTotal)}
                </p>

                <p className="mt-2 text-xs text-neutral-500">
                  {summary.yearCount} expense
                  {summary.yearCount === 1 ? "" : "s"} · click to filter
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/30">
                <CalendarRange size={21} className="text-cyan-400" />
              </div>
            </div>
          </button>

          {/* Average */}
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Average Expense
                </p>

                <p className="mt-3 text-3xl font-bold text-white">
                  {formatCurrency(summary.averagePerExpense)}
                </p>

                <p className="mt-2 text-xs text-neutral-500">
                  Per expense, current view · Monthly avg{" "}
                  <span className="text-neutral-300">
                    {formatCurrency(summary.averagePerMonth)}
                  </span>
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/30">
                <TrendingUp size={21} className="text-violet-400" />
              </div>
            </div>
          </div>
        </section>

        {/* CHARTS */}

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Monthly chart */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Monthly Expenses · {currentKeys.year}
              </h2>

              <span className="text-xs text-neutral-500">
                {formatCurrency(summary.yearTotal)}
              </span>
            </div>

            <div className="mt-5 flex h-44 items-end gap-2">
              {summary.monthly.map((paise, index) => {
                const height = paise > 0 ? Math.max(4, (paise / maxMonthly) * 100) : 0;
                const isCurrent = index === currentKeys.monthIndex;

                return (
                  <div
                    key={MONTH_LABELS[index]}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                    title={`${MONTH_LABELS[index]}: ${formatCurrency(paise)}`}
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full rounded-t-md transition-all ${
                          isCurrent ? "bg-lime-400" : "bg-lime-400/40"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>

                    <span
                      className={`text-[10px] ${
                        isCurrent ? "text-lime-300" : "text-neutral-500"
                      }`}
                    >
                      {MONTH_LABELS[index]}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-neutral-600">
              Reacts to search, type, user and amount filters, not to the
              date period.
            </p>
          </div>

          {/* Type breakdown */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                By Type of Expense
              </h2>

              <span className="text-xs text-neutral-500">
                {formatCurrency(summary.viewTotal)} in current view
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {typeBreakdown.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-600">
                  No data for the current view.
                </p>
              ) : (
                typeBreakdown.slice(0, 6).map((item) => (
                  <div key={item.type}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-neutral-300">
                        {expenseTypeLabels[item.type]}
                      </span>

                      <span className="text-neutral-500">
                        {formatCurrency(item.paise)} ·{" "}
                        {item.percent.toFixed(0)}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-black">
                      <div
                        className="h-full rounded-full bg-violet-400"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* FILTERS */}

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Search (description, user, type, amount) */}
            <div className="md:col-span-2">
              <label className={labelClass}>Search</label>

              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) =>
                    updateFilters({ search: event.target.value })
                  }
                  placeholder="Search description, type, user or amount..."
                  className={`${inputClass} pl-10 pr-4`}
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className={labelClass}>Type of Expense</label>

              <select
                value={filters.type}
                onChange={(event) => updateFilters({ type: event.target.value })}
                style={{ colorScheme: "dark" }}
                className={inputClass}
              >
                <option value="">All types</option>

                {EXPENSE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {expenseTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>

            {/* By user */}
            <div>
              <label className={labelClass}>By User</label>

              <select
                value={filters.userId}
                onChange={(event) =>
                  updateFilters({ userId: event.target.value })
                }
                style={{ colorScheme: "dark" }}
                className={inputClass}
              >
                <option value="">All users</option>

                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* From */}
            <div>
              <label className={labelClass}>From Date</label>

              <div className="relative">
                <Calendar
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(event) => {
                    setPeriod("all");
                    updateFilters({ from: event.target.value });
                  }}
                  style={{ colorScheme: "dark" }}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {/* To */}
            <div>
              <label className={labelClass}>To Date</label>

              <div className="relative">
                <Calendar
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(event) => {
                    setPeriod("all");
                    updateFilters({ to: event.target.value });
                  }}
                  style={{ colorScheme: "dark" }}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-4">
            <div className="text-xs text-neutral-500">
              Showing{" "}
              <span className="font-medium text-neutral-300">
                {filteredExpenses.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-neutral-300">
                {expenses.length}
              </span>{" "}
              expenses
              {hasFilters && (
                <span className="ml-2 text-lime-300">
                  · {activeFilterCount} filter
                  {activeFilterCount === 1 ? "" : "s"} applied
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="h-9 rounded-xl border border-neutral-800 bg-black px-4 text-sm text-neutral-400 transition hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear Filters
            </button>
          </div>
        </section>

        {/* SELECTION + EXPORT TOOLBAR */}

        <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            {selectedExpenses.length > 0 ? (
              <>
                <span>
                  <span className="font-medium text-lime-300">
                    {selectedExpenses.length}
                  </span>{" "}
                  selected
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="transition hover:text-white"
                >
                  Clear selection
                </button>
              </>
            ) : (
              <span>
                <span className="font-medium text-neutral-300">
                  {filteredExpenses.length}
                </span>{" "}
                filtered · total{" "}
                <span className="font-medium text-neutral-300">
                  {formatCurrency(summary.viewTotal)}
                </span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || filteredExpenses.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-lime-500/30 bg-lime-500/10 px-4 text-sm font-medium text-lime-300 transition hover:border-lime-400/50 hover:bg-lime-500/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? (
              <RefreshCcw size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}

            {selectedExpenses.length > 0 ? "Export Selected" : "Export Excel"}

            {selectedExpenses.length > 0 && (
              <span className="rounded-md bg-lime-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                {selectedExpenses.length}
              </span>
            )}
          </button>
        </section>

        {/* TABLE */}

        <section className="mt-4 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
          <div className="border-b border-neutral-800 px-6 py-5">
            <h2 className="text-lg font-semibold">Expense Records</h2>

            <p className="mt-1 text-sm text-neutral-500">
              All amounts are stored internally in paise.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-black/30 text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      disabled={filteredExpenses.length === 0}
                      className="h-4 w-4 cursor-pointer accent-lime-400 disabled:cursor-not-allowed"
                      aria-label="Select all filtered expenses"
                    />
                  </th>

                  <th className="px-6 py-4 text-left font-medium">
                    Description
                  </th>

                  <th className="px-6 py-4 text-left font-medium">Type</th>

                  <th className="px-6 py-4 text-left font-medium">By User</th>

                  <th className="px-6 py-4 text-left font-medium">Date</th>

                  <th className="px-6 py-4 text-right font-medium">Amount</th>

                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center text-sm text-neutral-500"
                    >
                      Loading expenses...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black">
                          <CircleDollarSign
                            size={22}
                            className="text-neutral-600"
                          />
                        </div>

                        <p className="mt-4 text-sm font-medium text-neutral-300">
                          No expenses found
                        </p>

                        <p className="mt-1 text-xs text-neutral-600">
                          {hasFilters
                            ? "Try changing your filters."
                            : "Add your first expense to get started."}
                        </p>

                        {hasFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-4 text-xs text-lime-400 hover:text-lime-300"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className={`transition hover:bg-white/[0.02] ${
                        selectedIds.has(expense.id) ? "bg-lime-400/[0.03]" : ""
                      }`}
                    >
                      {/* CHECKBOX */}
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(expense.id)}
                          onChange={() => toggleExpenseSelection(expense.id)}
                          className="h-4 w-4 cursor-pointer accent-lime-400"
                          aria-label={`Select ${
                            expense.description || "expense"
                          }`}
                        />
                      </td>

                      {/* DESCRIPTION */}
                      <td className="px-6 py-4">
                        <p className="max-w-[300px] truncate font-medium text-white">
                          {expense.description || "Untitled expense"}
                        </p>
                      </td>

                      {/* TYPE */}
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-md border border-neutral-700 bg-black px-2.5 py-1 text-xs text-neutral-300">
                          {expenseTypeLabels[getType(expense)]}
                        </span>
                      </td>

                      {/* BY USER */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-neutral-200">
                          {getUserName(expense)}
                        </p>
                      </td>

                      {/* DATE */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-neutral-300">
                          <CalendarDays
                            size={15}
                            className="text-neutral-600"
                          />
                          {formatDate(expense.date)}
                        </div>
                      </td>

                      {/* AMOUNT */}
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-lime-300">
                          {formatCurrency(expense.amount || 0)}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(expense)}
                            disabled={deletingId === expense.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-black text-neutral-400 transition hover:border-lime-400/50 hover:text-lime-300 disabled:opacity-50"
                            title="Edit expense"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(expense)}
                            disabled={deletingId === expense.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-black text-neutral-400 transition hover:border-red-500/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Delete expense"
                          >
                            {deletingId === expense.id ? (
                              <RefreshCcw size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-800 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingExpense ? "Edit Expense" : "Add Expense"}
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {editingExpense
                    ? "Update the expense details."
                    : "Create a new expense record."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-black hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5 p-6">
                {/* DESCRIPTION */}
                <div>
                  <label className={labelClass}>Description</label>

                  <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="e.g. Electricity bill"
                    disabled={saving}
                    className={`${inputClass} px-4 disabled:opacity-50`}
                  />
                </div>

                {/* TYPE OF EXPENSE */}
                <div>
                  <label className={labelClass}>Type of Expense</label>

                  <select
                    value={expenseType}
                    onChange={(event) =>
                      setExpenseType(event.target.value as ExpenseType)
                    }
                    disabled={saving}
                    style={{ colorScheme: "dark" }}
                    className={`${inputClass} px-4 disabled:opacity-50`}
                  >
                    {EXPENSE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {expenseTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AMOUNT */}
                <div>
                  <label className={labelClass}>Amount</label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                      disabled={saving}
                      className={`${inputClass} pl-9 pr-4 disabled:opacity-50`}
                    />
                  </div>

                  <p className="mt-2 text-xs text-neutral-600">
                    Enter the amount in rupees. It will be sent to the API in
                    paise.
                  </p>
                </div>

                {/* DATE */}
                <div>
                  <label className={labelClass}>Date</label>

                  <div className="relative">
                    <Calendar
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                    />

                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      disabled={saving}
                      style={{ colorScheme: "dark" }}
                      className={`${inputClass} pl-10 pr-4 disabled:opacity-50`}
                    />
                  </div>
                </div>

                {/* EDIT INFO */}
                {editingExpense && (
                  <div className="rounded-xl border border-neutral-800 bg-black/40 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400/10">
                        <User size={16} className="text-lime-400" />
                      </div>

                      <div>
                        <p className="text-xs text-neutral-500">Created by</p>

                        <p className="mt-0.5 text-sm text-neutral-200">
                          {getUserName(editingExpense)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-neutral-800 px-6 py-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-10 rounded-xl border border-neutral-800 bg-black px-5 text-sm text-neutral-400 transition hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime-400 px-5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <RefreshCcw size={15} className="animate-spin" />}

                  {editingExpense ? "Update Expense" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}