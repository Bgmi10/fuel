/**
 * Fuel TV plan engine.
 *
 * Pure functions, no framework or DB imports. The server builds plans,
 * the admin Preview runs the same code, and the Kotlin app mirrors
 * phaseAt() against the same JSON fixtures.
 *
 * Time model:
 *   elapsedMs = (pausedAt ?? now) - startedAt - pausedTotalMs
 * The phase is whichever one contains elapsedMs.
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

export interface PlanExercise {
  id: string;
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
  /** Index into plan.exercises, or null (timer-only, or phases like PREPARE) */
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
  nextSessionStartsAt: string | null;
  timers: TimerSettings;
  /** Already filtered and ordered for ONE tv. Empty for TIMER_ONLY. */
  exercises: PlanExercise[];
  run: RunState;
}

export interface BroadcastPlan {
  broadcastId: string;
  version: number;
  status: BroadcastStatus;
  mode: "SCHEDULE" | "TIMER_ONLY";
  title: string | null;
  subtitle: string | null;
  nextSessionStartsAt: string | null;
  sets: number;
  cycles: number;
  exercises: PlanExercise[];
  phases: PlanPhase[];
  totalMs: number;
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

/**
 * Timeline rules
 *
 *   PREPARE -> WARMUP ->
 *   for cycle in 1..cycles
 *     for set in 1..sets
 *       for each exercise
 *         DEMONSTRATION   (only cycle 1, set 1, once per exercise)
 *         WORK
 *         REST            (after every WORK except the last one of a cycle,
 *                          which is followed by REST_BETWEEN_CYCLE / COOLDOWN)
 *     REST_BETWEEN_CYCLE  (not after the last cycle)
 *   -> COOLDOWN
 *
 * - Phases with 0 / null seconds are omitted.
 * - If workSeconds is unset, a video exercise falls back to its own
 *   video duration. A manual exercise then has no WORK phase.
 * - Timer-only (no exercises) behaves as one anonymous exercise.
 */
export function buildPhases(
  timers: TimerSettings,
  exercises: PlanExercise[]
): { phases: PlanPhase[]; totalMs: number; sets: number; cycles: number } {
  const sets = atLeastOne(timers.sets);
  const cycles = atLeastOne(timers.cycles);

  const slots: (number | null)[] =
    exercises.length > 0 ? exercises.map((_, index) => index) : [null];

  const phases: PlanPhase[] = [];
  let cursor = 0;

  const push = (
    type: PhaseType,
    durationSec: number,
    exerciseIndex: number | null,
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
      exerciseIndex,
      set,
      cycle,
    });
    cursor += durationMs;
  };

  push("PREPARE", seconds(timers.prepareSeconds), null, null, null);
  push("WARMUP", seconds(timers.warmupSeconds), null, null, null);

  for (let cycle = 1; cycle <= cycles; cycle++) {
    for (let set = 1; set <= sets; set++) {
      slots.forEach((exerciseIndex, position) => {
        if (cycle === 1 && set === 1) {
          push(
            "DEMONSTRATION",
            seconds(timers.demonstrationSeconds),
            exerciseIndex,
            set,
            cycle
          );
        }

        const work =
          seconds(timers.workSeconds) ||
          (exerciseIndex !== null
            ? seconds(exercises[exerciseIndex].durationSeconds)
            : 0);

        push("WORK", work, exerciseIndex, set, cycle);

        const isLastOfCycle =
          set === sets && position === slots.length - 1;

        if (!isLastOfCycle) {
          push("REST", seconds(timers.restSeconds), exerciseIndex, set, cycle);
        }
      });
    }

    if (cycle < cycles) {
      push(
        "REST_BETWEEN_CYCLE",
        seconds(timers.restBetweenCycleSeconds),
        null,
        null,
        cycle
      );
    }
  }

  push("COOLDOWN", seconds(timers.coolDownSeconds), null, null, null);

  if (phases.length === 0) {
    throw new PlanError(
      "NO_PHASES",
      "This broadcast has no timed phases. Set a work time, or use exercises that have a video duration."
    );
  }

  return { phases, totalMs: cursor, sets, cycles };
}

export function buildPlan(
  input: BuildPlanInput,
  serverNow: number
): BroadcastPlan {
  const { phases, totalMs, sets, cycles } = buildPhases(
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
    nextSessionStartsAt: input.nextSessionStartsAt,
    sets,
    cycles,
    exercises: input.exercises,
    phases,
    totalMs,
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
      elapsedMs: number;
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
  plan: Pick<BroadcastPlan, "phases" | "totalMs">,
  run: RunState,
  nowMs: number
): PlanPosition {
  const elapsed = elapsedMs(run, nowMs);

  if (elapsed === null) {
    return { state: "WAITING" };
  }

  if (elapsed >= plan.totalMs) {
    return { state: "DONE", elapsedMs: elapsed };
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
