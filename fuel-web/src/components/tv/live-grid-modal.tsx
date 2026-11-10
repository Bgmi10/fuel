"use client";

/**
 * Live Preview and Edit Layout.
 *
 * - Preview: every TV of the branch with what it is running right now.
 *   Clocks run locally from plan.run (corrected for server offset) and the
 *   data refetches when the realtime `refreshKey` changes.
 * - Edit layout: same grid, with drag-and-drop swap, replace, remove and
 *   add-from-search on each TV. Every action is one REST call; the server
 *   pushes the new plan to the TV instantly without restarting timers.
 *
 * Pass `broadcastId` to scope it to a single broadcast (works for
 * SCHEDULED broadcasts too). Without it, it shows the branch's live TVs.
 */
import { Check, Loader2, Maximize2, Minimize2, Plus, Radio, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { BroadcastPlan } from "@/src/lib/tv/plan";

import { api, errorMessage } from "./api";
import { TvScreen, type TileEditor } from "./tv-screen";

const MAX_TV_VIDEOS = 8;
const EDITABLE = ["SCHEDULED", "LIVE", "PAUSED"];

interface TvEntry {
  tvDeviceId: string;
  name: string;
  isOnline: boolean;
  plan: BroadcastPlan | null;
}

interface LiveResponse {
  serverNow: number;
  tvs: (TvEntry & { lastSeenAt: string | null })[];
}

interface LibraryVideo {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

interface PickerTarget {
  broadcastId: string;
  tvDeviceId: string;
  replaceExerciseId?: string;
}

interface Props {
  branchId: string;
  initialMode: "preview" | "edit";
  broadcastId?: string;
  /** Changes whenever the realtime socket reports a change. */
  refreshKey: number;
  connected: boolean;
  onClose: () => void;
}

const STATUS_CHIP: Record<string, string> = {
  SCHEDULED: "bg-lime-400/10 text-lime-400 border-lime-400/20",
  LIVE: "bg-red-500/10 text-red-400 border-red-500/20",
  PAUSED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-blue-400/10 text-blue-400 border-blue-400/20",
};

export function LiveGridModal({
  branchId,
  initialMode,
  broadcastId,
  refreshKey,
  connected,
  onClose,
}: Props) {
  const [mode, setMode] = useState(initialMode);
  const [entries, setEntries] = useState<TvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showVideos, setShowVideos] = useState(true);
  const [applyAll, setApplyAll] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  const offsetRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  // Local clock, corrected by the server offset.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offsetRef.current), 250);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    try {
      if (broadcastId) {
        const broadcast = await api<{
          tvs: { tvDeviceId: string; tvDevice: { name: string; isOnline: boolean } }[];
        }>(`/api/workout-broadcasts/${broadcastId}`);

        const list = await Promise.all(
          broadcast.tvs.map(async (tv): Promise<TvEntry> => {
            let plan: BroadcastPlan | null = null;

            try {
              plan = await api<BroadcastPlan>(
                `/api/workout-broadcasts/${broadcastId}/plan?tvId=${encodeURIComponent(
                  tv.tvDeviceId
                )}`
              );
            } catch {
              /* unplayable plan: show idle */
            }

            return {
              tvDeviceId: tv.tvDeviceId,
              name: tv.tvDevice.name,
              isOnline: tv.tvDevice.isOnline,
              plan,
            };
          })
        );

        const stamp = list.find((item) => item.plan)?.plan?.serverNow;
        if (stamp) {
          offsetRef.current = stamp - Date.now();
        }
        setEntries(list);
      } else {
        const live = await api<LiveResponse>(
          `/api/workout-broadcasts/live?branchId=${encodeURIComponent(branchId)}`
        );

        offsetRef.current = live.serverNow - Date.now();
        setEntries(live.tvs);
      }

      setError("");
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [branchId, broadcastId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // Slow safety refresh in case the socket is down.
  useEffect(() => {
    if (connected) {
      return;
    }

    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [connected, load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !picker) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, picker]);

  // ---------------- Edit actions ----------------

  async function perform(action: () => Promise<unknown>) {
    try {
      setBusy(true);
      setError("");
      await action();
      await load();
    } catch (actionError) {
      setError(errorMessage(actionError));
      await load(); // roll the optimistic view back
    } finally {
      setBusy(false);
    }
  }

  const scope = (entry: TvEntry) => (applyAll ? {} : { tvDeviceId: entry.tvDeviceId });

  function swap(entry: TvEntry, fromId: string, toId: string) {
    const plan = entry.plan;

    if (!plan) {
      return;
    }

    const ids = plan.exercises.map((exercise) => exercise.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);

    if (from === -1 || to === -1) {
      return;
    }

    [ids[from], ids[to]] = [ids[to], ids[from]];

    // Optimistic: reorder immediately, the server confirms right after.
    const byId = new Map(plan.exercises.map((exercise) => [exercise.id, exercise]));
    setEntries((current) =>
      current.map((item) =>
        item.tvDeviceId === entry.tvDeviceId && item.plan
          ? {
              ...item,
              plan: { ...item.plan, exercises: ids.map((id) => byId.get(id)!) },
            }
          : item
      )
    );

    void perform(() =>
      api(`/api/workout-broadcasts/${plan.broadcastId}/layout`, {
        method: "PATCH",
        body: JSON.stringify({ exerciseIds: ids, ...scope(entry) }),
      })
    );
  }

  function remove(entry: TvEntry, exerciseId: string) {
    const plan = entry.plan;

    if (!plan) {
      return;
    }

    const query = new URLSearchParams({ exerciseId });
    if (!applyAll) {
      query.set("tvDeviceId", entry.tvDeviceId);
    }

    void perform(() =>
      api(`/api/workout-broadcasts/${plan.broadcastId}/exercises?${query.toString()}`, {
        method: "DELETE",
      })
    );
  }

  function pick(video: LibraryVideo) {
    const target = picker;
    setPicker(null);

    if (!target) {
      return;
    }

    const entry = entries.find((item) => item.tvDeviceId === target.tvDeviceId);

    if (!entry) {
      return;
    }

    void perform(() =>
      api(`/api/workout-broadcasts/${target.broadcastId}/exercises`, {
        method: "POST",
        body: JSON.stringify({
          videoId: video.id,
          ...scope(entry),
          ...(target.replaceExerciseId
            ? { replaceExerciseId: target.replaceExerciseId }
            : {}),
        }),
      })
    );
  }

  // ---------------- Render ----------------

  const visible = useMemo(
    () => (focusId ? entries.filter((entry) => entry.tvDeviceId === focusId) : entries),
    [entries, focusId]
  );

  const editing = mode === "edit";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-5 py-3">
        <div className="mr-2">
          <h2 className="font-semibold">
            {editing ? "Edit Layout" : "Live Preview"}
          </h2>
          <p className="text-[11px] text-zinc-500">
            {editing
              ? "Drag a video onto another to swap them. Changes reach the TV instantly."
              : "What each TV is playing right now."}
          </p>
        </div>

        <div className="flex rounded-lg border border-zinc-800 p-0.5">
          {(["preview", "edit"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                mode === value
                  ? "bg-lime-400 text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {value === "preview" ? "Preview" : "Edit layout"}
            </button>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={showVideos}
            onChange={(event) => setShowVideos(event.target.checked)}
            className="accent-lime-400"
          />
          Play videos
        </label>

        {editing && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={applyAll}
              onChange={(event) => setApplyAll(event.target.checked)}
              className="accent-lime-400"
            />
            Apply to every TV in the same broadcast
          </label>
        )}

        <span
          className={`ml-auto inline-flex items-center gap-1.5 text-[11px] ${
            connected ? "text-lime-400" : "text-zinc-600"
          }`}
        >
          <Radio size={13} />
          {connected ? "Live updates on" : "Reconnecting..."}
        </span>

        {busy && <Loader2 size={16} className="animate-spin text-lime-400" />}

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"
        >
          <X size={19} />
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-3 flex items-start justify-between gap-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Grid of TVs */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-lime-400" size={26} />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-600">
            No TVs to show for this {broadcastId ? "broadcast" : "branch"}.
          </div>
        ) : (
          <div
            className={`mx-auto grid gap-5 ${
              focusId || visible.length === 1
                ? "max-w-5xl grid-cols-1"
                : visible.length === 2
                ? "grid-cols-1 xl:grid-cols-2"
                : "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3"
            }`}
          >
            {visible.map((entry) => {
              const plan = entry.plan;
              const canEdit =
                editing &&
                !!plan &&
                plan.mode === "SCHEDULE" &&
                EDITABLE.includes(plan.status);

              const editor: TileEditor | undefined = canEdit
                ? {
                    onSwap: (from, to) => swap(entry, from, to),
                    onRemove: (id) => remove(entry, id),
                    onReplace: (id) =>
                      setPicker({
                        broadcastId: plan!.broadcastId,
                        tvDeviceId: entry.tvDeviceId,
                        replaceExerciseId: id,
                      }),
                  }
                : undefined;

              return (
                <div key={entry.tvDeviceId}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        entry.isOnline ? "bg-lime-400" : "bg-zinc-700"
                      }`}
                      title={entry.isOnline ? "Online" : "Offline"}
                    />
                    <span className="text-sm font-semibold text-zinc-200">{entry.name}</span>

                    {plan && (
                      <>
                        <span className="truncate text-xs text-zinc-500">
                          {plan.title ?? "Workout"}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            STATUS_CHIP[plan.status] ?? STATUS_CHIP.SCHEDULED
                          }`}
                        >
                          {plan.status}
                        </span>
                        {plan.loop && plan.status === "LIVE" && (
                          <span className="text-[10px] text-zinc-600">loops</span>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      title={focusId ? "Show all TVs" : "Enlarge"}
                      onClick={() => setFocusId(focusId ? null : entry.tvDeviceId)}
                      className="ml-auto rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                    >
                      {focusId ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                  </div>

                  <TvScreen
                    plan={plan}
                    nowMs={now}
                    showVideos={showVideos}
                    editor={editor}
                    idleText={entry.isOnline ? "Idle" : "Offline"}
                  />

                  {editing && plan && !canEdit && (
                    <p className="mt-2 text-[11px] text-zinc-600">
                      {plan.mode === "TIMER_ONLY"
                        ? "Timer-only broadcasts have no videos."
                        : "This broadcast is finished and can't be edited."}
                    </p>
                  )}

                  {canEdit && plan && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-600">
                        {plan.exercises.length} of {MAX_TV_VIDEOS} videos
                      </span>
                      <button
                        type="button"
                        disabled={plan.exercises.length >= MAX_TV_VIDEOS || busy}
                        onClick={() =>
                          setPicker({
                            broadcastId: plan.broadcastId,
                            tvDeviceId: entry.tvDeviceId,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-lime-400/40 hover:text-lime-300 disabled:opacity-40"
                      >
                        <Plus size={13} />
                        Add video
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {picker && <VideoPicker replacing={!!picker.replaceExerciseId} onPick={pick} onClose={() => setPicker(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------
// Library search
// ------------------------------------------------------------------

function VideoPicker({
  replacing,
  onPick,
  onClose,
}: {
  replacing: boolean;
  onPick: (video: LibraryVideo) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const list = await api<LibraryVideo[]>(
          `/api/workout-videos/search?q=${encodeURIComponent(query.trim())}&limit=20`
        );
        if (!cancelled) {
          setResults(list);
          setError("");
        }
      } catch (searchError) {
        if (!cancelled) {
          setError(errorMessage(searchError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h3 className="text-sm font-semibold">
            {replacing ? "Replace with a library video" : "Add a library video"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search videos by name..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-lime-400"
            />
          </div>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {loading && results.length === 0 ? (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin text-lime-400" />
              </div>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-600">No matching videos.</p>
            ) : (
              results.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => onPick(video)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-800"
                >
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="h-9 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-9 w-16 shrink-0 rounded bg-zinc-800" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                    {video.name}
                  </span>
                  {video.durationSeconds ? (
                    <span className="shrink-0 text-[10px] text-zinc-600">
                      {video.durationSeconds}s
                    </span>
                  ) : null}
                  <Check size={13} className="shrink-0 text-zinc-700" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}