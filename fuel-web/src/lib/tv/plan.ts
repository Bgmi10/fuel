/**
 * Fuel TV plan engine.
 *
 * Pure functions, no framework or DB imports. The server builds plans,
 * the admin Preview runs the same code, and the Kotlin app mirrors
 * phaseAt() against the same JSON fixtures.
 *
 * Grid playback: every video on a TV plays AT THE SAME TIME, so there is
 * ONE shared timeline per broadcast. The exercise list only decides which
 * tiles exist and in what order. Adding, removing or reordering videos
 * never changes the phases, so a live edit can never restart the timers.
 *
 * Time model:
 *   elapsedMs = (pausedAt ?? now) - startedAt - pausedTotalMs
 * If plan.loop is true the position wraps: elapsedMs % totalMs.
 */

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type PhaseType =
  | "PREPARE"
  | "WARMUP"
  | "DEMONSTRATION"
  | "WORK"
  | "REST"
  | "REST_BETWEEN_CYCLE"
  | "COOLDOWN";

export type PlanIntensity = "LOW" | "MEDIUM" | "HIGH";

export interface TimerSettings {
  demonstrationSeconds?: number | null;
  warmupSeconds?: number | null;
  prepareSeconds?: number | null;
  workSeconds?: number | null;
  restSeconds?: number | null;
  sets?: number | null;
  cycles?: number | null;
  restBetweenCycleSeconds?: number | null;
  coolDownSeconds?: number | null;
}

/** Normalised timers for the static bottom overlay on the TV. 0 = not used. */
export interface PlanTimers {
  demonstrationSeconds: number;
  warmupSeconds: number;
  prepareSeconds: number;
  /** Effective work time (falls back to the longest video when unset). */
  workSeconds: number;
  restSeconds: number;
  sets: number;
  cycles: number;
  restBetweenCycleSeconds: number;
  coolDownSeconds: number;
}

export interface PlanExercise {
  /** WorkoutBroadcastExercise.id. The TV keys its tiles by this. */
  id: string;
  /** Admin-side only. The TV does not render titles. */
  name: string;
  /** null => manual (name only) exercise */
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

export interface PlanPhase {
  index: number;
  type: PhaseType;
  startMs: number;
  durationMs: number;
  /** Always null now: all exercises share the timeline. Kept for JSON compatibility. */
  exerciseIndex: number | null;
  /** 1-based, null for phases outside the set/cycle loop */
  set: number | null;
  cycle: number | null;
}

/** Run state in epoch milliseconds. */
export interface RunState {
  startedAt: number | null;
  pausedAt: number | null;
  pausedTotalMs: number;
}

export type BroadcastStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

export interface BuildPlanInput {
  broadcastId: string;
  version: number;
  status: BroadcastStatus;
  mode: "SCHEDULE" | "TIMER_ONLY";
  title: string | null;
  subtitle: string | null;
  intensity: PlanIntensity | null;
  nextSessionStartsAt: string | null;
  timers: TimerSettings;
  /** Already filtered and ordered for ONE tv (grid order). Empty for TIMER_ONLY. */
  exercises: PlanExercise[];
  run: RunState;
  /** Restart from scratch after COOLDOWN instead of finishing. */
  loop: boolean;
}

export interface BroadcastPlan {
  broadcastId: string;
  version: number;
  status: BroadcastStatus;
  mode: "SCHEDULE" | "TIMER_ONLY";
  title: string | null;
  subtitle: string | null;
  /** Read-only label on every video tile. */
  intensity: PlanIntensity | null;
  nextSessionStartsAt: string | null;
  sets: number;
  cycles: number;
  timers: PlanTimers;
  /** Grid order: index 0 is the first tile. */
  exercises: PlanExercise[];
  phases: PlanPhase[];
  totalMs: number;
  /** true => the TV wraps elapsed % totalMs and restarts the videos each lap. */
  loop: boolean;
  run: RunState;
  /** Epoch ms when the server created this payload. TVs use it for clock offset. */
  serverNow: number;
}

export class PlanError extends Error {
  readonly code: "NO_PHASES";

  constructor(code: "NO_PHASES", message: string) {
    super(message);
    this.name = "PlanError";
    this.code = code;
  }
}

// ------------------------------------------------------------------
// Building
// ------------------------------------------------------------------

function seconds(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

function atLeastOne(value: number | null | undefined): number {
  return Math.max(1, seconds(value));
}

/** Timers without exercise info (idle screen cards). */
export function normalizeTimers(
  timers: TimerSettings,
  longestVideoSeconds = 0
): PlanTimers {
  return {
    demonstrationSeconds: seconds(timers.demonstrationSeconds),
    warmupSeconds: seconds(timers.warmupSeconds),
    prepareSeconds: seconds(timers.prepareSeconds),
    workSeconds: seconds(timers.workSeconds) || longestVideoSeconds,
    restSeconds: seconds(timers.restSeconds),
    sets: atLeastOne(timers.sets),
    cycles: atLeastOne(timers.cycles),
    restBetweenCycleSeconds: seconds(timers.restBetweenCycleSeconds),
    coolDownSeconds: seconds(timers.coolDownSeconds),
  };
}

/**
 * Timeline rules (ONE shared timeline, all videos play together)
 *
 *   PREPARE -> WARMUP ->
 *   for cycle in 1..cycles
 *     for set in 1..sets
 *       DEMONSTRATION   (cycle 1, set 1 only)
 *       WORK
 *       REST            (after every WORK except the last set of a cycle)
 *     REST_BETWEEN_CYCLE  (not after the last cycle)
 *   -> COOLDOWN
 *
 * - Phases with 0 / null seconds are omitted.
 * - If workSeconds is unset, WORK falls back to the LONGEST video duration.
 */
export function buildPhases(
  timers: TimerSettings,
  exercises: PlanExercise[]
): {
  phases: PlanPhase[];
  totalMs: number;
  sets: number;
  cycles: number;
  timers: PlanTimers;
} {
  const longestVideo = exercises.reduce(
    (max, exercise) => Math.max(max, seconds(exercise.durationSeconds)),
    0
  );
  const normalized = normalizeTimers(timers, longestVideo);
  const { sets, cycles } = normalized;

  const phases: PlanPhase[] = [];
  let cursor = 0;

  const push = (
    type: PhaseType,
    durationSec: number,
    set: number | null,
    cycle: number | null
  ) => {
    if (durationSec <= 0) {
      return;
    }
    const durationMs = durationSec * 1000;
    phases.push({
      index: phases.length,
      type,
      startMs: cursor,
      durationMs,
      exerciseIndex: null,
      set,
      cycle,
    });
    cursor += durationMs;
  };

    // After
    push("DEMONSTRATION", normalized.demonstrationSeconds, null, null);
    push("WARMUP", normalized.warmupSeconds, null, null);
    push("PREPARE", normalized.prepareSeconds, null, null);
  
    for (let cycle = 1; cycle <= cycles; cycle++) {
      for (let set = 1; set <= sets; set++) {
        push("WORK", normalized.workSeconds, set, cycle);

      if (set < sets) {
        push("REST", normalized.restSeconds, set, cycle);
      }
    }

    if (cycle < cycles) {
      push("REST_BETWEEN_CYCLE", normalized.restBetweenCycleSeconds, null, cycle);
    }
  }

  push("COOLDOWN", normalized.coolDownSeconds, null, null);

  if (phases.length === 0) {
    throw new PlanError(
      "NO_PHASES",
      "This broadcast has no timed phases. Set a work time, or use exercises that have a video duration."
    );
  }

  return { phases, totalMs: cursor, sets, cycles, timers: normalized };
}

export function buildPlan(
  input: BuildPlanInput,
  serverNow: number
): BroadcastPlan {
  const { phases, totalMs, sets, cycles, timers } = buildPhases(
    input.timers,
    input.exercises
  );

  return {
    broadcastId: input.broadcastId,
    version: input.version,
    status: input.status,
    mode: input.mode,
    title: input.title,
    subtitle: input.subtitle,
    intensity: input.intensity,
    nextSessionStartsAt: input.nextSessionStartsAt,
    sets,
    cycles,
    timers,
    exercises: input.exercises,
    phases,
    totalMs,
    loop: input.loop,
    run: input.run,
    serverNow,
  };
}

// ------------------------------------------------------------------
// Clock
// ------------------------------------------------------------------

export type PlanPosition =
  | { state: "WAITING" }
  | {
      state: "RUNNING" | "PAUSED";
      /** ms inside the current lap */
      elapsedMs: number;
      /** 0 for the first pass, 1 after the first loop restart, ... */
      lap: number;
      phaseIndex: number;
      phase: PlanPhase;
      nextPhase: PlanPhase | null;
      /** ms left in the current phase */
      remainingMs: number;
    }
  | { state: "DONE"; elapsedMs: number };

export function elapsedMs(run: RunState, nowMs: number): number | null {
  if (run.startedAt === null) {
    return null;
  }
  const reference = run.pausedAt ?? nowMs;
  return Math.max(0, reference - run.startedAt - run.pausedTotalMs);
}

export function phaseAt(
  plan: Pick<BroadcastPlan, "phases" | "totalMs"> & { loop?: boolean },
  run: RunState,
  nowMs: number
): PlanPosition {
  const raw = elapsedMs(run, nowMs);

  if (raw === null) {
    return { state: "WAITING" };
  }

  let elapsed = raw;
  let lap = 0;

  if (raw >= plan.totalMs) {
    if (!plan.loop) {
      return { state: "DONE", elapsedMs: raw };
    }
    lap = Math.floor(raw / plan.totalMs);
    elapsed = raw % plan.totalMs;
  }

  // Binary search: last phase whose startMs <= elapsed.
  let low = 0;
  let high = plan.phases.length - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (plan.phases[middle].startMs <= elapsed) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  const phase = plan.phases[low];

  return {
    state: run.pausedAt !== null ? "PAUSED" : "RUNNING",
    elapsedMs: elapsed,
    lap,
    phaseIndex: low,
    phase,
    nextPhase: plan.phases[low + 1] ?? null,
    remainingMs: phase.startMs + phase.durationMs - elapsed,
  };
}

/** Convert DB dates to the epoch-ms RunState used everywhere else. */
export function runStateFromRow(row: {
  startedAt: Date | null;
  pausedAt: Date | null;
  pausedTotalMs: number;
}): RunState {
  return {
    startedAt: row.startedAt ? row.startedAt.getTime() : null,
    pausedAt: row.pausedAt ? row.pausedAt.getTime() : null,
    pausedTotalMs: row.pausedTotalMs,
  };
}