// Run with:  npx tsx --test src/lib/tv/plan.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PlanError,
  buildPhases,
  buildPlan,
  phaseAt,
  type PlanExercise,
  type RunState,
} from "./plan";

const video = (id: string, durationSeconds: number | null = null): PlanExercise => ({
  id,
  name: `Exercise ${id}`,
  videoUrl: `https://cdn.test/${id}.mp4`,
  thumbnailUrl: null,
  durationSeconds,
});

const manual = (id: string): PlanExercise => ({
  id,
  name: `Manual ${id}`,
  videoUrl: null,
  thumbnailUrl: null,
  durationSeconds: null,
});

const types = (timers: Parameters<typeof buildPhases>[0], ex: PlanExercise[]) =>
  buildPhases(timers, ex).phases.map((p) => p.type);

describe("buildPhases", () => {
  it("builds the full sequence for 2 exercises, 2 sets, 1 cycle", () => {
    const { phases, totalMs } = buildPhases(
      {
        prepareSeconds: 10,
        warmupSeconds: 20,
        demonstrationSeconds: 15,
        workSeconds: 40,
        restSeconds: 20,
        sets: 2,
        cycles: 1,
        coolDownSeconds: 30,
      },
      [video("a"), video("b")]
    );

    assert.deepEqual(
      phases.map((p) => p.type),
      [
        "PREPARE",
        "WARMUP",
        "DEMONSTRATION", "WORK", "REST", // set 1, ex a
        "DEMONSTRATION", "WORK", "REST", // set 1, ex b
        "WORK", "REST", //                  set 2, ex a
        "WORK", //                          set 2, ex b (last of cycle: no rest)
        "COOLDOWN",
      ]
    );

    assert.equal(totalMs, 310_000);
  });

  it("has contiguous, increasing start times", () => {
    const { phases, totalMs } = buildPhases(
      { workSeconds: 30, restSeconds: 10, sets: 3, cycles: 2, restBetweenCycleSeconds: 60 },
      [video("a"), video("b"), video("c")]
    );

    let cursor = 0;
    phases.forEach((phase, index) => {
      assert.equal(phase.index, index);
      assert.equal(phase.startMs, cursor);
      cursor += phase.durationMs;
    });
    assert.equal(cursor, totalMs);
  });

  it("puts REST_BETWEEN_CYCLE between cycles only", () => {
    const sequence = types(
      { workSeconds: 30, restSeconds: 10, cycles: 3, restBetweenCycleSeconds: 60 },
      [video("a")]
    );

    assert.deepEqual(sequence, [
      "WORK", "REST_BETWEEN_CYCLE",
      "WORK", "REST_BETWEEN_CYCLE",
      "WORK",
    ]);
  });

  it("shows demonstration once per exercise, only in cycle 1 set 1", () => {
    const { phases } = buildPhases(
      { demonstrationSeconds: 5, workSeconds: 20, sets: 2, cycles: 2 },
      [video("a"), video("b")]
    );

    const demos = phases.filter((p) => p.type === "DEMONSTRATION");
    assert.equal(demos.length, 2);
    assert.deepEqual(demos.map((p) => p.exerciseIndex), [0, 1]);
    assert.ok(demos.every((p) => p.set === 1 && p.cycle === 1));
  });

  it("omits null and zero phases", () => {
    const sequence = types(
      { prepareSeconds: 0, warmupSeconds: null, workSeconds: 30, restSeconds: 0 },
      [video("a"), video("b")]
    );

    assert.deepEqual(sequence, ["WORK", "WORK"]);
  });

  it("treats missing or zero sets and cycles as 1", () => {
    const result = buildPhases({ workSeconds: 10, sets: 0, cycles: null }, [video("a")]);
    assert.equal(result.sets, 1);
    assert.equal(result.cycles, 1);
    assert.equal(result.phases.length, 1);
  });

  it("runs timer-only mode as one anonymous exercise", () => {
    const { phases } = buildPhases(
      { workSeconds: 40, restSeconds: 20, sets: 3 },
      []
    );

    assert.deepEqual(phases.map((p) => p.type), ["WORK", "REST", "WORK", "REST", "WORK"]);
    assert.ok(phases.every((p) => p.exerciseIndex === null));
  });

  it("falls back to the video duration when workSeconds is not set", () => {
    const { phases } = buildPhases({ restSeconds: 5 }, [video("a", 45), video("b", 30)]);

    assert.deepEqual(
      phases.map((p) => [p.type, p.durationMs / 1000]),
      [["WORK", 45], ["REST", 5], ["WORK", 30]]
    );
  });

  it("gives manual exercises no WORK phase when workSeconds is not set", () => {
    const { phases } = buildPhases({ restSeconds: 5 }, [manual("m"), video("a", 30)]);
    assert.deepEqual(phases.map((p) => p.type), ["REST", "WORK"]);
  });

  it("throws when nothing has a duration", () => {
    assert.throws(
      () => buildPhases({}, [manual("m")]),
      (error: unknown) => error instanceof PlanError && error.code === "NO_PHASES"
    );
  });

  it("truncates fractional seconds and ignores negatives and NaN", () => {
    const { phases } = buildPhases(
      { workSeconds: 30.9, restSeconds: -5, prepareSeconds: Number.NaN },
      [video("a"), video("b")]
    );
    assert.deepEqual(phases.map((p) => [p.type, p.durationMs]), [["WORK", 30_000], ["WORK", 30_000]]);
  });
});

describe("phaseAt", () => {
  const plan = buildPlan(
    {
      broadcastId: "b1",
      version: 1,
      status: "LIVE",
      mode: "SCHEDULE",
      title: "T",
      subtitle: null,
      nextSessionStartsAt: null,
      timers: { prepareSeconds: 10, workSeconds: 30, restSeconds: 10 },
      exercises: [video("a"), video("b")],
      run: { startedAt: null, pausedAt: null, pausedTotalMs: 0 },
    },
    0
  );
  // PREPARE 0-10s, WORK 10-40s, REST 40-50s, WORK 50-80s. total 80s.

  const running = (startedAt: number, pausedTotalMs = 0): RunState => ({
    startedAt,
    pausedAt: null,
    pausedTotalMs,
  });

  it("is WAITING before the broadcast starts", () => {
    const position = phaseAt(plan, { startedAt: null, pausedAt: null, pausedTotalMs: 0 }, 5_000);
    assert.equal(position.state, "WAITING");
  });

  it("finds the right phase and remaining time", () => {
    const position = phaseAt(plan, running(1_000), 1_000 + 25_000);
    assert.ok(position.state === "RUNNING");
    assert.equal(position.phase.type, "WORK");
    assert.equal(position.phase.exerciseIndex, 0);
    assert.equal(position.remainingMs, 15_000);
    assert.equal(position.nextPhase?.type, "REST");
  });

  it("moves to the next phase exactly on the boundary", () => {
    const at = (offset: number) => phaseAt(plan, running(0), offset);
    const before = at(9_999);
    const exactly = at(10_000);

    assert.ok(before.state === "RUNNING" && exactly.state === "RUNNING");
    assert.equal(before.phase.type, "PREPARE");
    assert.equal(exactly.phase.type, "WORK");
  });

  it("is DONE at and after the total duration", () => {
    assert.equal(phaseAt(plan, running(0), 80_000).state, "DONE");
    assert.equal(phaseAt(plan, running(0), 500_000).state, "DONE");
    assert.equal(phaseAt(plan, running(0), 79_999).state, "RUNNING");
  });

  it("freezes while paused", () => {
    const run: RunState = { startedAt: 0, pausedAt: 25_000, pausedTotalMs: 0 };
    const early = phaseAt(plan, run, 26_000);
    const late = phaseAt(plan, run, 900_000);

    assert.ok(early.state === "PAUSED" && late.state === "PAUSED");
    assert.equal(early.elapsedMs, 25_000);
    assert.equal(late.elapsedMs, 25_000);
    assert.equal(late.phase.type, "WORK");
  });

  it("subtracts time spent paused after a resume", () => {
    // Started at 0, paused for 20s total, now 45s on the wall clock => 25s elapsed.
    const position = phaseAt(plan, running(0, 20_000), 45_000);
    assert.ok(position.state === "RUNNING");
    assert.equal(position.elapsedMs, 25_000);
    assert.equal(position.phase.type, "WORK");
  });

  it("never reports negative elapsed time (clock skew)", () => {
    const position = phaseAt(plan, running(10_000), 9_000);
    assert.ok(position.state === "RUNNING");
    assert.equal(position.elapsedMs, 0);
    assert.equal(position.phase.type, "PREPARE");
  });
});
