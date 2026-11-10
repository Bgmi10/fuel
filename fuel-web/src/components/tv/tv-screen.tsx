"use client";

/**
 * TvScreen: what a TV shows, drawn in the admin.
 *
 * - All videos play at once, muted, in an equal grid. The column count is
 *   computed from the container's size so any screen (32" or 55") fills
 *   itself. The Kotlin app should use the same gridColumns() rule.
 * - Tiles keep a STABLE DOM order (sorted by id) and are placed with
 *   gridColumn/gridRow, so reordering never remounts a <video>: unchanged
 *   videos keep playing during a live edit.
 * - On a loop restart (lap changes) the videos remount and start from 0.
 * - No titles on tiles (videos have them burned in). Manual, video-less
 *   exercises show their name because there is nothing else to see.
 * - Sizes use container query units (cqw), so it scales like a real TV.
 */
import { GripVertical, RefreshCw, Trash2, Tv } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  phaseAt,
  type BroadcastPlan,
  type PhaseType,
  type PlanIntensity,
  type PlanTimers,
  type RunState,
} from "@/src/lib/tv/plan";

export const PHASE_LABEL: Record<PhaseType, string> = {
  PREPARE: "GET READY",
  WARMUP: "WARM-UP",
  DEMONSTRATION: "DEMONSTRATION",
  WORK: "WORK",
  REST: "REST",
  REST_BETWEEN_CYCLE: "CYCLE REST",
  COOLDOWN: "COOL DOWN",
};

export function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
}

/**
 * Columns that make tiles closest to 16:9 for this container, with a small
 * penalty for empty cells in the last row.
 */
export function gridColumns(
  count: number,
  width: number,
  height: number,
  tileAspect = 16 / 9
): number {
  if (count <= 1) {
    return 1;
  }

  if (!width || !height) {
    return Math.ceil(Math.sqrt(count));
  }

  let best = 1;
  let bestScore = Infinity;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const aspect = width / cols / (height / rows);
    const score =
      Math.abs(Math.log(aspect / tileAspect)) + (cols * rows - count) * 0.06;

    if (score < bestScore - 1e-9) {
      best = cols;
      bestScore = score;
    }
  }

  return best;
}

const INTENSITY_STYLE: Record<PlanIntensity, string> = {
  LOW: "bg-lime-400 text-black",
  MEDIUM: "bg-amber-400 text-black",
  HIGH: "bg-red-500 text-white",
};

const OVERLAY: {
  key: keyof PlanTimers;
  label: string;
  phase?: PhaseType;
  count?: boolean;
  rest?: boolean;
}[] = [
  { key: "demonstrationSeconds", label: "Demonstration", phase: "DEMONSTRATION" },
  { key: "warmupSeconds", label: "Warm-up", phase: "WARMUP" },
  { key: "prepareSeconds", label: "Prepare", phase: "PREPARE" },
  { key: "workSeconds", label: "Work", phase: "WORK" },
  { key: "restSeconds", label: "Rest", phase: "REST", rest: true },
  { key: "sets", label: "Sets", count: true },
  { key: "cycles", label: "Cycles", count: true },
  {
    key: "restBetweenCycleSeconds",
    label: "Rest Between Cycle",
    phase: "REST_BETWEEN_CYCLE",
    rest: true,
  },
  { key: "coolDownSeconds", label: "Cool Down", phase: "COOLDOWN" },
];

export interface TileEditor {
  onSwap: (fromId: string, toId: string) => void;
  onRemove: (exerciseId: string) => void;
  onReplace: (exerciseId: string) => void;
}

interface TvScreenProps {
  /** null => the TV is idle. */
  plan: BroadcastPlan | null;
  /** Epoch ms, already corrected for server clock offset. */
  nowMs: number;
  /** Simulation override; defaults to plan.run. */
  run?: RunState;
  idleText?: string;
  showVideos?: boolean;
  editor?: TileEditor;
}

function startLabel(iso: string | null) {
  if (!iso) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function TvScreen({
  plan,
  nowMs,
  run,
  idleText = "Idle",
  showVideos = true,
  editor,
}: TvScreenProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    const element = areaRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const position = useMemo(
    () =>
      plan
        ? phaseAt(
            { phases: plan.phases, totalMs: plan.totalMs, loop: plan.loop },
            run ?? plan.run,
            nowMs
          )
        : null,
    [plan, run, nowMs]
  );

  const active = position && (position.state === "RUNNING" || position.state === "PAUSED");
  const phase = active ? position.phase : null;
  const lap = active ? position.lap : 0;
  const paused = position?.state === "PAUSED";

  const exercises = plan?.exercises ?? [];
  const count = exercises.length;
  const cols = gridColumns(count, size.w, size.h);
  const rows = Math.max(1, Math.ceil(count / cols));

  // Stable DOM order; visual order comes from gridColumn/gridRow.
  const tiles = useMemo(
    () =>
      exercises
        .map((exercise, index) => ({ exercise, index }))
        .sort((a, b) => a.exercise.id.localeCompare(b.exercise.id)),
    [exercises]
  );

  const timerOnly = !!plan && count === 0;

  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
      style={{ containerType: "inline-size" }}
    >
      <div
        ref={areaRef}
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gap: "0.3cqw",
        }}
      >
        {tiles.map(({ exercise, index }) => (
          <div
            key={exercise.id}
            draggable={!!editor}
            onDragStart={(event) => {
              if (!editor) return;
              event.dataTransfer.setData("text/plain", exercise.id);
              event.dataTransfer.effectAllowed = "move";
              setDragId(exercise.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(event) => {
              if (!editor || !dragId) return;
              event.preventDefault();
              setOverId(exercise.id);
            }}
            onDrop={(event) => {
              if (!editor) return;
              event.preventDefault();
              const from = event.dataTransfer.getData("text/plain") || dragId;
              setDragId(null);
              setOverId(null);
              if (from && from !== exercise.id) {
                editor.onSwap(from, exercise.id);
              }
            }}
            style={{
              gridColumn: (index % cols) + 1,
              gridRow: Math.floor(index / cols) + 1,
            }}
            className={`group relative overflow-hidden bg-zinc-950 ${
              editor ? "cursor-grab active:cursor-grabbing" : ""
            } ${dragId === exercise.id ? "opacity-40" : ""} ${
              overId === exercise.id && dragId !== exercise.id
                ? "ring-2 ring-inset ring-lime-400"
                : ""
            }`}
          >
            {showVideos && exercise.videoUrl ? (
              <video
                key={`${exercise.id}:${lap}`}
                ref={(element) => {
                  if (!element) return;
                  if (paused) {
                    element.pause();
                  } else {
                    void element.play().catch(() => undefined);
                  }
                }}
                src={exercise.videoUrl}
                poster={exercise.thumbnailUrl ?? undefined}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            ) : exercise.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={exercise.thumbnailUrl}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
                <span
                  className="font-bold text-zinc-300"
                  style={{ fontSize: "1.8cqw" }}
                >
                  {exercise.name}
                </span>
              </div>
            )}

            {plan?.intensity && (
              <span
                className={`absolute left-0 top-0 font-black uppercase tracking-wider ${
                  INTENSITY_STYLE[plan.intensity]
                }`}
                style={{
                  fontSize: "1cqw",
                  padding: "0.35cqw 0.8cqw",
                  borderBottomRightRadius: "0.6cqw",
                }}
              >
                {plan.intensity}
              </span>
            )}

            {editor && (
              <>
                <span
                  className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 font-bold text-zinc-300"
                  style={{ fontSize: "max(10px, 1cqw)" }}
                >
                  <GripVertical size={11} />
                  {index + 1}
                </span>

                <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    title="Replace video"
                    onClick={() => editor.onReplace(exercise.id)}
                    className="rounded bg-black/75 p-1.5 text-zinc-200 hover:bg-lime-400 hover:text-black"
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    type="button"
                    title={count <= 1 ? "A TV needs at least one video" : "Remove video"}
                    disabled={count <= 1}
                    onClick={() => editor.onRemove(exercise.id)}
                    className="rounded bg-black/75 p-1.5 text-zinc-200 hover:bg-red-500 hover:text-white disabled:opacity-30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Idle */}
      {!plan && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
          <Tv style={{ width: "5cqw", height: "5cqw" }} />
          <p className="mt-2 font-semibold" style={{ fontSize: "2cqw" }}>
            {idleText}
          </p>
        </div>
      )}

      {/* Timer-only: one big timer */}
      {timerOnly && phase && active && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-black tracking-[0.3em] text-lime-400" style={{ fontSize: "2cqw" }}>
            {PHASE_LABEL[phase.type]}
          </p>
          <p className="font-black tabular-nums" style={{ fontSize: "11cqw" }}>
            {clock(position.remainingMs)}
          </p>
        </div>
      )}

      {/* Phase chip */}
      {plan && !timerOnly && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/75 font-black tabular-nums text-white"
          style={{ top: "1cqw", padding: "0.4cqw 1.4cqw", fontSize: "1.5cqw" }}
        >
          {position?.state === "DONE" ? (
            <span className="text-lime-400">COMPLETED</span>
          ) : phase && active ? (
            <>
              <span className="text-lime-400">{PHASE_LABEL[phase.type]}</span>
              <span className="ml-2">{clock(position.remainingMs)}</span>
              {phase.set !== null && (
                <span className="ml-2 font-semibold text-zinc-400">
                  S{phase.set}/{plan.sets} · C{phase.cycle}/{plan.cycles}
                </span>
              )}
              {paused && <span className="ml-2 text-amber-400">PAUSED</span>}
            </>
          ) : (
            <span className="text-zinc-300">
              SCHEDULED
              {startLabel(plan.nextSessionStartsAt)
                ? ` · ${startLabel(plan.nextSessionStartsAt)}`
                : ""}
            </span>
          )}
        </div>
      )}

      {/* Bottom overlay: static program timers, active one highlighted */}
      {plan && (
        <div
          className="absolute inset-x-0 bottom-0 flex items-stretch justify-center bg-black/80"
          style={{ gap: "0.3cqw", padding: "0.5cqw 0.8cqw" }}
        >
          {OVERLAY.filter(
            (item) => item.count || (plan.timers[item.key] as number) > 0
          ).map((item) => {
            const value = plan.timers[item.key] as number;
            const isActive = !!phase && item.phase === phase.type;

            return (
              <div
                key={item.key}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded ${
                  isActive ? "bg-lime-400 text-black" : ""
                }`}
                style={{ padding: "0.3cqw 0.2cqw" }}
              >
                <span
                  className={`truncate font-semibold uppercase tracking-wide ${
                    isActive ? "text-black/70" : item.rest ? "text-amber-300" : "text-zinc-500"
                  }`}
                  style={{ fontSize: "0.95cqw" }}
                >
                  {item.label}
                </span>
                <span
                  className={`font-black tabular-nums ${
                    isActive ? "" : item.rest ? "text-amber-300" : "text-white"
                  }`}
                  style={{ fontSize: item.rest ? "1.9cqw" : "1.7cqw" }}
                >
                  {item.count ? value : `${value}s`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}