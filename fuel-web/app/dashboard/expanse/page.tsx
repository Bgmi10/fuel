"use client";

import {
  Calendar,
  CalendarDays,
  CircleDollarSign,
  Download,
  Edit3,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
/* ============================================================
   TYPES
============================================================ */

type Expense = {
  id: string;
  description: string | null;
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

const formatDate = (value: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateInput = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getUserName = (expense: Expense) => {
  return expense.byUser?.name?.trim() || "Unknown User";
};

/* ============================================================
   PAGE
============================================================ */

export default function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(
    []
  );
  
  const [exporting, setExporting] = useState(false);

  

  /* ============================================================
     FILTERS
  ============================================================ */

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* ============================================================
     MODAL
  ============================================================ */

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(
    null
  );

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  /* ============================================================
     FETCH EXPENSES
  ============================================================ */

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      /* --------------------------------------------------------
         SEARCH
      -------------------------------------------------------- */

      const userName = getUserName(expense);

      const amountInRupees =
        expense.amount != null
          ? (expense.amount / 100).toFixed(2)
          : "";

      const matchesSearch =
        !query ||
        (expense.description || "")
          .toLowerCase()
          .includes(query) ||
        userName.toLowerCase().includes(query) ||
        amountInRupees.includes(query) ||
        String(expense.amount ?? "").includes(query);

      if (!matchesSearch) {
        return false;
      }

      /* --------------------------------------------------------
         DATE RANGE
      -------------------------------------------------------- */

      if (!expense.date) {
        return !fromDate && !toDate;
      }

      const expenseDate = new Date(expense.date);

      if (Number.isNaN(expenseDate.getTime())) {
        return false;
      }

      /*
       * Compare only the date portion so timezone differences
       * don't incorrectly exclude a record.
       */
      const expenseDateString = formatDateInput(expense.date);

      if (fromDate && expenseDateString < fromDate) {
        return false;
      }

      if (toDate && expenseDateString > toDate) {
        return false;
      }

      return true;
    });
  }, [expenses, search, fromDate, toDate]);



  const selectedExpenses = useMemo(() => {
    const selectedSet = new Set(selectedExpenseIds);
  
    return filteredExpenses.filter((expense) =>
      selectedSet.has(expense.id)
    );
  }, [filteredExpenses, selectedExpenseIds]);
  
  const allFilteredSelected =
    filteredExpenses.length > 0 &&
    filteredExpenses.every((expense) =>
      selectedExpenseIds.includes(expense.id)
    );
  
  const toggleExpenseSelection = (expenseId: string) => {
    setSelectedExpenseIds((current) => {
      if (current.includes(expenseId)) {
        return current.filter((id) => id !== expenseId);
      }
  
      return [...current, expenseId];
    });
  };
  
  const toggleSelectAllFiltered = () => {
    setSelectedExpenseIds((current) => {
      const currentSet = new Set(current);
  
      const everyFilteredSelected =
        filteredExpenses.length > 0 &&
        filteredExpenses.every((expense) =>
          currentSet.has(expense.id)
        );
  
      if (everyFilteredSelected) {
        /*
         * Remove only the currently filtered records.
         * Selections outside the current filter remain untouched.
         */
        const filteredIds = new Set(
          filteredExpenses.map((expense) => expense.id)
        );
  
        return current.filter(
          (id) => !filteredIds.has(id)
        );
      }
  
      /*
       * Add all currently filtered records.
       */
      filteredExpenses.forEach((expense) => {
        currentSet.add(expense.id);
      });
  
      return Array.from(currentSet);
    });
  };
  
  const clearSelection = () => {
    setSelectedExpenseIds([]);
  };


  const handleExportExcel = async () => {
    /*
     * If the user selected specific rows,
     * export only those rows.
     *
     * Otherwise export all currently filtered rows.
     */
    const recordsToExport =
      selectedExpenses.length > 0
        ? selectedExpenses
        : filteredExpenses;
  
    if (recordsToExport.length === 0) {
      setError("There are no expenses to export.");
      return;
    }
  
    setExporting(true);
    setError("");
  
    try {
      const exportRows = recordsToExport.map(
        (expense, index) => ({
          "S.No": index + 1,
  
          Description:
            expense.description || "Untitled expense",
  
          "By User": getUserName(expense),
  
          Date: expense.date
            ? formatDate(expense.date)
            : "",
  
          /*
           * Human-readable INR value.
           */
          "Amount (₹)": Number(
            ((expense.amount || 0) / 100).toFixed(2)
          ),
  
          /*
           * Original database/API value.
           */
          "Amount (Paise)": expense.amount || 0,
  
          "Expense ID": expense.id,
        })
      );
  
      const worksheet = XLSX.utils.json_to_sheet(
        exportRows
      );
  
      /*
       * Custom column widths.
       */
      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 32 },
        { wch: 24 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 32 },
      ];
  
      /*
       * Add autofilter to the Excel table.
       */
      if (exportRows.length > 0) {
        worksheet["!autofilter"] = {
          ref: `A1:G${exportRows.length + 1}`,
        };
      }
  
      const workbook = XLSX.utils.book_new();
  
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Expenses"
      );
  
      /*
       * Create a second sheet containing
       * export/filter information.
       */
      const filterRows = [
        {
          "Exported At": new Date().toLocaleString(
            "en-IN"
          ),
  
          "Records Exported":
            recordsToExport.length,
  
          Search: search || "All",
  
          "From Date": fromDate || "All",
  
          "To Date": toDate || "All",
  
          Selection:
            selectedExpenses.length > 0
              ? "Selected entries"
              : "All filtered entries",
  
          "Total Amount (₹)": Number(
            (
              recordsToExport.reduce(
                (sum, expense) =>
                  sum + (expense.amount || 0),
                0
              ) / 100
            ).toFixed(2)
          ),
        },
      ];
  
      const filterWorksheet =
        XLSX.utils.json_to_sheet(filterRows);
  
      filterWorksheet["!cols"] = [
        { wch: 24 },
        { wch: 20 },
        { wch: 30 },
        { wch: 16 },
        { wch: 16 },
        { wch: 24 },
        { wch: 22 },
      ];
  
      XLSX.utils.book_append_sheet(
        workbook,
        filterWorksheet,
        "Export Summary"
      );
  
      /*
       * Filename.
       */
      const now = new Date();
  
      const timestamp =
        `${now.getFullYear()}-` +
        `${String(now.getMonth() + 1).padStart(2, "0")}-` +
        `${String(now.getDate()).padStart(2, "0")}_` +
        `${String(now.getHours()).padStart(2, "0")}-` +
        `${String(now.getMinutes()).padStart(2, "0")}`;
  
      XLSX.writeFile(
        workbook,
        `expenses_${timestamp}.xlsx`
      );
    } catch (exportError) {
      console.error(
        "Failed to export expenses:",
        exportError
      );
  
      setError("Failed to export expenses.");
    } finally {
      setExporting(false);
    }
  };

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
          result?.error || "Failed to load expenses"
        );
      }

      /*
       * Supports either:
       *   result = Expense[]
       *
       * or:
       *   result = { expenses: Expense[] }
       */
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
     FILTERED EXPENSES
  ============================================================ */

  
  /* ============================================================
     SUMMARY
  ============================================================ */

  const summary = useMemo(() => {
    const totalPaise = filteredExpenses.reduce(
      (total, expense) => total + (expense.amount || 0),
      0
    );

    return {
      count: filteredExpenses.length,
      totalPaise,
      averagePaise:
        filteredExpenses.length > 0
          ? Math.round(totalPaise / filteredExpenses.length)
          : 0,
    };
  }, [filteredExpenses]);

  /* ============================================================
     OPEN CREATE MODAL
  ============================================================ */

  const openCreateModal = () => {
    setEditingExpense(null);

    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);

    setError("");
    setShowModal(true);
  };

  /* ============================================================
     OPEN EDIT MODAL
  ============================================================ */

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);

    setDescription(expense.description || "");

    /*
     * Database/API amount is PAISA.
     *
     * Example:
     * 50050 paise -> ₹500.50
     */
    setAmount(
      expense.amount != null
        ? String(expense.amount / 100)
        : ""
    );

    setDate(formatDateInput(expense.date));

    setError("");
    setShowModal(true);
  };

  /* ============================================================
     CLOSE MODAL
  ============================================================ */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingExpense(null);

    setDescription("");
    setAmount("");
    setDate("");
  };

  /* ============================================================
     SUBMIT
  ============================================================ */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    const trimmedDescription = description.trim();
    const numericAmount = Number(amount);

    if (!trimmedDescription) {
      setError("Please enter an expense description.");
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

    /*
     * IMPORTANT:
     *
     * UI:
     * ₹500.50
     *
     * API:
     * 50050 paise
     */
    const amountInPaise = Math.round(numericAmount * 100);

    if (amountInPaise <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingExpense);

      const response = await fetch(
        isEditing
          ? `/api/expenses/${editingExpense!.id}`
          : "/api/expenses",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: trimmedDescription,

            /*
             * Send PAISA to API.
             */
            amount: amountInPaise,

            date: date || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            `Failed to ${
              isEditing ? "update" : "create"
            } expense`
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
      `Delete this expense?\n\n${
        expense.description || "Expense"
      }\n${formatCurrency(expense.amount || 0)}`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(expense.id);
    setError("");

    try {
      const response = await fetch(
        `/api/expenses/${expense.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Failed to delete expense"
        );
      }

      setExpenses((current) =>
        current.filter(
          (item) => item.id !== expense.id
        )
      );
    } catch (requestError) {
      console.error(
        "Failed to delete expense:",
        requestError
      );

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
     CLEAR FILTERS
  ============================================================ */

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
  };

  const hasFilters =
    Boolean(search) ||
    Boolean(fromDate) ||
    Boolean(toDate);

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-lime-500/20 bg-lime-500/10">
                <CircleDollarSign
                  size={22}
                  className="text-lime-400"
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  Expenses
                </h1>

                <p className="mt-1 text-sm text-neutral-500">
                  Track and manage gym expenses.
                </p>
              </div>
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
                className={
                  loading ? "animate-spin" : ""
                }
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

        {/* ======================================================
            ERROR
        ====================================================== */}

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

        {/* ======================================================
            SUMMARY CARDS
        ====================================================== */}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-lime-500/20 bg-lime-500/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Total Expenses
                </p>

                <p className="mt-3 text-3xl font-bold text-white">
                  {formatCurrency(
                    summary.totalPaise
                  )}
                </p>

                <p className="mt-2 text-xs text-neutral-500">
                  Based on current filters
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/30">
                <CircleDollarSign
                  size={21}
                  className="text-lime-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Expense Count
                </p>

                <p className="mt-3 text-3xl font-bold text-white">
                  {summary.count}
                </p>

                <p className="mt-2 text-xs text-neutral-500">
                  Matching expense records
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/30">
                <CalendarDays
                  size={21}
                  className="text-cyan-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Average Expense
                </p>

                <p className="mt-3 text-3xl font-bold text-white">
                  {formatCurrency(
                    summary.averagePaise
                  )}
                </p>

                <p className="mt-2 text-xs text-neutral-500">
                  Average per record
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/30">
                <CircleDollarSign
                  size={21}
                  className="text-violet-400"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================
            FILTERS
        ====================================================== */}

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="mt-4 flex flex-col gap-3 border-t border-neutral-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex flex-wrap items-center gap-2">
    <div className="text-xs text-neutral-500">
      {selectedExpenseIds.length > 0 ? (
        <>
          <span className="font-medium text-lime-300">
            {selectedExpenseIds.length}
          </span>{" "}
          selected
        </>
      ) : (
        <>
          <span className="font-medium text-neutral-300">
            {filteredExpenses.length}
          </span>{" "}
          filtered
        </>
      )}
    </div>

    {selectedExpenseIds.length > 0 && (
      <button
        type="button"
        onClick={clearSelection}
        className="text-xs text-neutral-500 transition hover:text-white"
      >
        Clear selection
      </button>
    )}
  </div>

  <button
    type="button"
    onClick={handleExportExcel}
    disabled={
      exporting ||
      filteredExpenses.length === 0
    }
    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-lime-500/30 bg-lime-500/10 px-4 text-sm font-medium text-lime-300 transition hover:border-lime-400/50 hover:bg-lime-500/15 disabled:cursor-not-allowed disabled:opacity-40"
  >
    {exporting ? (
      <RefreshCcw
        size={16}
        className="animate-spin"
      />
    ) : (
      <Download size={16} />
    )}

    Export Excel

    {selectedExpenseIds.length > 0 && (
      <span className="rounded-md bg-lime-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
        {selectedExpenseIds.length}
      </span>
    )}
  </button>
</div>

          <div className="grid gap-4 lg:grid-cols-[1fr_200px_200px_auto]">
            {/* SEARCH */}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                Search
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search description, user or amount..."
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-black pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-400"
                />
              </div>
            </div>

            {/* FROM */}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                From Date
              </label>

              <div className="relative">
                <Calendar
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(event) =>
                    setFromDate(event.target.value)
                  }
                  style={{
                    colorScheme: "dark",
                  }}
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-black pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400"
                />
              </div>
            </div>

            {/* TO */}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                To Date
              </label>

              <div className="relative">
                <Calendar
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />

                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) =>
                    setToDate(event.target.value)
                  }
                  style={{
                    colorScheme: "dark",
                  }}
                  className="h-11 w-full rounded-xl border border-neutral-800 bg-black pl-10 pr-3 text-sm text-white outline-none focus:border-lime-400"
                />
              </div>
            </div>

            {/* CLEAR */}

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="h-11 w-full rounded-xl border border-neutral-800 bg-black px-4 text-sm text-neutral-400 transition hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear Filters
              </button>
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
            </div>

            {hasFilters && (
              <div className="text-xs text-lime-300">
                Filters applied
              </div>
            )}
          </div>
        </section>

        {/* ======================================================
            TABLE
        ====================================================== */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
          <div className="border-b border-neutral-800 px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Expense Records
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  All amounts are stored internally in paise.
                </p>
              </div>

              {hasFilters && (
                <span className="rounded-lg border border-lime-500/20 bg-lime-500/10 px-3 py-1.5 text-xs text-lime-300">
                  Filtered
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
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

                  <th className="px-6 py-4 text-left font-medium">
                    By User
                  </th>

                  <th className="px-6 py-4 text-left font-medium">
                    Date
                  </th>

                  <th className="px-6 py-4 text-right font-medium">
                    Amount
                  </th>

                  <th className="px-6 py-4 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center text-sm text-neutral-500"
                    >
                      Loading expenses...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center"
                    >
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
                  filteredExpenses.map(
                    (expense) => (
                      <tr
                        key={expense.id}
                        className="transition hover:bg-white/[0.02]"
                      >
                        {/* DESCRIPTION */}
                        <td className="px-4 py-4 text-center">
  <input
    type="checkbox"
    checked={selectedExpenseIds.includes(
      expense.id
    )}
    onChange={() =>
      toggleExpenseSelection(expense.id)
    }
    className="h-4 w-4 cursor-pointer accent-lime-400"
    aria-label={`Select ${
      expense.description || "expense"
    }`}
  />
</td>

                        <td className="px-6 py-4">
                          <div className="max-w-[300px]">
                            <p className="truncate font-medium text-white">
                              {expense.description ||
                                "Untitled expense"}
                            </p>

                          </div>
                        </td>

                        {/* BY USER */}

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm text-neutral-200">
                                {getUserName(
                                  expense
                                )}
                              </p>

                            </div>
                          </div>
                        </td>

                        {/* DATE */}

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-neutral-300">
                            <CalendarDays
                              size={15}
                              className="text-neutral-600"
                            />

                            {formatDate(
                              expense.date
                            )}
                          </div>
                        </td>

                        {/* AMOUNT */}

                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-lime-300">
                            {formatCurrency(
                              expense.amount || 0
                            )}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  expense
                                )
                              }
                              disabled={
                                deletingId ===
                                expense.id
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-black text-neutral-400 transition hover:border-lime-400/50 hover:text-lime-300 disabled:opacity-50"
                              title="Edit expense"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  expense
                                )
                              }
                              disabled={
                                deletingId ===
                                expense.id
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-black text-neutral-400 transition hover:border-red-500/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Delete expense"
                            >
                              {deletingId ===
                              expense.id ? (
                                <RefreshCcw
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={15}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ========================================================
          CREATE / EDIT MODAL
      ======================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-start justify-between border-b border-neutral-800 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editingExpense
                    ? "Edit Expense"
                    : "Add Expense"}
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

            {/* FORM */}

            <form onSubmit={handleSubmit}>
              <div className="space-y-5 p-6">
                {/* DESCRIPTION */}

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                    Description
                  </label>

                  <input
                    type="text"
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Electricity bill"
                    disabled={saving}
                    className="h-11 w-full rounded-xl border border-neutral-800 bg-black px-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400 disabled:opacity-50"
                  />
                </div>

                {/* AMOUNT */}

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                    Amount
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) =>
                        setAmount(
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      disabled={saving}
                      className="h-11 w-full rounded-xl border border-neutral-800 bg-black pl-9 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-lime-400 disabled:opacity-50"
                    />
                  </div>

                  <p className="mt-2 text-xs text-neutral-600">
                    Enter the amount in rupees. It
                    will be sent to the API in paise.
                  </p>
                </div>

                {/* DATE */}

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.14em] text-neutral-500">
                    Date
                  </label>

                  <div className="relative">
                    <Calendar
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                    />

                    <input
                      type="date"
                      value={date}
                      onChange={(event) =>
                        setDate(
                          event.target.value
                        )
                      }
                      disabled={saving}
                      style={{
                        colorScheme: "dark",
                      }}
                      className="h-11 w-full rounded-xl border border-neutral-800 bg-black pl-10 pr-4 text-sm text-white outline-none focus:border-lime-400 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* EDIT INFO */}

                {editingExpense && (
                  <div className="rounded-xl border border-neutral-800 bg-black/40 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400/10">
                        <User
                          size={16}
                          className="text-lime-400"
                        />
                      </div>

                      <div>
                        <p className="text-xs text-neutral-500">
                          Created by
                        </p>

                        <p className="mt-0.5 text-sm text-neutral-200">
                          {getUserName(
                            editingExpense
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}

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
                  {saving && (
                    <RefreshCcw
                      size={15}
                      className="animate-spin"
                    />
                  )}

                  {editingExpense
                    ? "Update Expense"
                    : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}