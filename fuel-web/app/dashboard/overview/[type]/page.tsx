"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Column = {
  key: string;
  label: string;
  type?: "text" | "money" | "date" | "datetime" | "days" | "badge";
  align?: "right";
};

type Summary = { label: string; value: number | string; kind: "money" | "count" };

type DetailsResponse = {
  success: boolean;
  message?: string;
  title: string;
  subtitle: string;
  summary: Summary[];
  columns: Column[];
  rows: Array<Record<string, any>>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const money = (paise: number) =>
  `₹${(Number(paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCell = (value: any, type: Column["type"]) => {
  if (value === null || value === undefined || value === "") return "-";

  switch (type) {
    case "money":
      return money(value);

    case "date":
      return new Date(value).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    case "datetime":
      return new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    case "days":
      return `${value} day${Number(value) === 1 ? "" : "s"}`;

    default:
      return String(value);
  }
};

function DetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { type } = useParams<{ type: string }>();

  const [page, setPage] = useState(1);
  const [data, setData] = useState<DetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = searchParams.toString();

  // start from page 1 whenever the view or filters change
  useEffect(() => {
    setPage(1);
  }, [type, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams(query);

      params.set("type", type);
      params.set("page", String(page));

      const response = await fetch(
        `/api/dashboard/details?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load details.");
      }

      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load details.");
    } finally {
      setLoading(false);
    }
  }, [type, query, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openMember = (row: Record<string, any>) => {
    if (row.memberId) router.push(`/dashboard/members/${row.memberId}`);
  };

  return (
    <div className="min-h-screen bg-black p-5 text-white lg:p-6">
      <div className="mx-auto max-w-[1300px]">
        {/* HEADER */}

        <div className="mb-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold">{data?.title || "Details"}</h1>

            <p className="mt-1 text-sm text-neutral-500">
              {data?.subtitle || (loading ? "Loading..." : "")}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        {data && data.summary.length > 0 && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.summary.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <p className="text-xs text-neutral-500">{item.label}</p>

                <p className="mt-2 text-xl font-bold">
                  {item.kind === "money"
                    ? money(Number(item.value))
                    : Number(item.value).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* TABLE */}

        <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-3 p-14 text-neutral-500">
              <Loader2 size={18} className="animate-spin text-lime-400" />
              Loading...
            </div>
          ) : !data || data.rows.length === 0 ? (
            <div className="p-14 text-center text-sm text-neutral-500">
              No records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
                    {data.columns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-5 py-4 font-medium ${
                          column.align === "right" ? "text-right" : ""
                        }`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => openMember(row)}
                      className={`border-b border-neutral-800/60 last:border-0 ${
                        row.memberId
                          ? "cursor-pointer transition hover:bg-white/[0.03]"
                          : ""
                      }`}
                    >
                      {data.columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-5 py-4 ${
                            column.align === "right"
                              ? "text-right font-semibold"
                              : "text-neutral-300"
                          } ${column.key === "member" ? "font-medium text-white" : ""}`}
                        >
                          {column.type === "badge" ? (
                            <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300">
                              {formatCell(row[column.key], "text")}
                            </span>
                          ) : (
                            formatCell(row[column.key], column.type)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-4">
              <p className="text-xs text-neutral-600">
                Showing {(data.page - 1) * data.pageSize + 1} –{" "}
                {Math.min(data.page * data.pageSize, data.total)} of{" "}
                {data.total}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition hover:border-lime-400/40 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="min-w-16 text-center text-xs text-neutral-500">
                  Page {data.page} / {data.totalPages}
                </span>

                <button
                  type="button"
                  disabled={data.page >= data.totalPages || loading}
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition hover:border-lime-400/40 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardDetailsPage() {
  return (
    <Suspense
      fallback={<div className="p-10 text-neutral-500">Loading...</div>}
    >
      <DetailsContent />
    </Suspense>
  );
}