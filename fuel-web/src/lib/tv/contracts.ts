/**
 * Request contracts for the admin API (zod).
 *
 * Collection responses are always { data: [...] } and single responses
 * are always { data: {...} }. Errors are { error: string, issues?: [...] }.
 * Dates are dateKey strings ("YYYY-MM-DD", Asia/Kolkata), never timestamps.
 */
import { z } from "zod";

import { isValidDateKey } from "./date-key";

// ------------------------------------------------------------------
// Primitives
// ------------------------------------------------------------------

export const dateKeySchema = z
  .string()
  .refine(isValidDateKey, { message: "Use a valid date in YYYY-MM-DD format." });

const idSchema = z.string().min(1).max(64);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

export const intensitySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const MAX_PHASE_SECONDS = 6 * 60 * 60; // 6 hours
const MAX_REPEAT = 99;

const phaseSeconds = z
  .number()
  .int()
  .min(0)
  .max(MAX_PHASE_SECONDS)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const repeatCount = z
  .number()
  .int()
  .min(1)
  .max(MAX_REPEAT)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

/** Shared by schedules and broadcasts. */
export const timerShape = {
  demonstrationSeconds: phaseSeconds,
  warmupSeconds: phaseSeconds,
  prepareSeconds: phaseSeconds,
  workSeconds: phaseSeconds,
  restSeconds: phaseSeconds,
  sets: repeatCount,
  cycles: repeatCount,
  restBetweenCycleSeconds: phaseSeconds,
  coolDownSeconds: phaseSeconds,
  nextSessionStartsAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Enter a valid date and time.",
    })
    .nullable()
    .optional()
    .transform((value) => value ?? null),
};

// ------------------------------------------------------------------
// Exercises (library video OR manual name)
// ------------------------------------------------------------------

export const exerciseInputSchema = z.union([
  z.object({ videoId: idSchema }),
  z.object({ exerciseName: z.string().trim().min(1).max(120) }),
]);

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;

const MAX_EXERCISES = 100;

// ------------------------------------------------------------------
// Schedule (centralised)
// ------------------------------------------------------------------

export const scheduleInputSchema = z.object({
  dateKey: dateKeySchema,
  programId: idSchema,
  ...timerShape,
  exercises: z
    .array(exerciseInputSchema)
    .min(1, "Add at least one exercise.")
    .max(MAX_EXERCISES),
});

export type ScheduleInput = z.infer<typeof scheduleInputSchema>;

export const scheduleQuerySchema = z.object({
  from: dateKeySchema,
  to: dateKeySchema,
});

// ------------------------------------------------------------------
// Broadcast (branch wise)
// ------------------------------------------------------------------

export const broadcastTvInputSchema = z.object({
  tvDeviceId: idSchema,
  /**
   * Positions in the broadcast's exercises array this TV should play,
   * in play order. Omit to play every exercise (SCHEDULE mode only).
   */
  exerciseSortOrders: z.array(z.number().int().min(0)).max(MAX_EXERCISES).optional(),
});

export const broadcastInputSchema = z
  .object({
    branchId: idSchema,
    dateKey: dateKeySchema,
    mode: z.enum(["SCHEDULE", "TIMER_ONLY"]),
    scheduleId: idSchema.nullable().optional(),

    title: optionalText(120),
    subtitle: optionalText(160),
    description: optionalText(1000),
    intensity: intensitySchema.nullable().optional().transform((v) => v ?? null),

    ...timerShape,

    exercises: z.array(exerciseInputSchema).max(MAX_EXERCISES),
    tvs: z.array(broadcastTvInputSchema).max(50),
  })
  .superRefine((value, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    // No TV twice.
    const seenTvs = new Set<string>();
    value.tvs.forEach((tv, index) => {
      if (seenTvs.has(tv.tvDeviceId)) {
        issue(["tvs", index, "tvDeviceId"], "This TV is selected more than once.");
      }
      seenTvs.add(tv.tvDeviceId);
    });

    if (value.mode === "SCHEDULE") {
      if (value.exercises.length === 0) {
        issue(["exercises"], "Add at least one exercise.");
      }

      value.tvs.forEach((tv, tvIndex) => {
        if (tv.exerciseSortOrders === undefined) {
          return; // defaults to every exercise
        }

        if (tv.exerciseSortOrders.length === 0) {
          issue(
            ["tvs", tvIndex, "exerciseSortOrders"],
            "Select at least one exercise for this TV."
          );
        }

        const seen = new Set<number>();
        tv.exerciseSortOrders.forEach((order, orderIndex) => {
          if (order >= value.exercises.length) {
            issue(
              ["tvs", tvIndex, "exerciseSortOrders", orderIndex],
              "This exercise does not exist in the broadcast."
            );
          }
          if (seen.has(order)) {
            issue(
              ["tvs", tvIndex, "exerciseSortOrders", orderIndex],
              "An exercise can only be selected once per TV."
            );
          }
          seen.add(order);
        });
      });
    }

    if (value.mode === "TIMER_ONLY") {
      if (value.exercises.length > 0) {
        issue(["exercises"], "Timer-only broadcasts cannot have exercises.");
      }

      if (value.scheduleId) {
        issue(["scheduleId"], "Timer-only broadcasts cannot reference a schedule.");
      }

      if (!value.workSeconds || value.workSeconds <= 0) {
        issue(["workSeconds"], "Enter a work time so the timer has something to count.");
      }

      value.tvs.forEach((tv, tvIndex) => {
        if (tv.exerciseSortOrders && tv.exerciseSortOrders.length > 0) {
          issue(
            ["tvs", tvIndex, "exerciseSortOrders"],
            "Timer-only broadcasts have no exercises to select."
          );
        }
      });
    }
  });

export type BroadcastInput = z.infer<typeof broadcastInputSchema>;

export const broadcastQuerySchema = z.object({
  branchId: idSchema,
  from: dateKeySchema,
  to: dateKeySchema,
});

// ------------------------------------------------------------------
// Errors
// ------------------------------------------------------------------

export interface ApiErrorBody {
  error: string;
  issues?: { path: string; message: string }[];
}

export function formatZodError(error: z.ZodError): ApiErrorBody {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return {
    error: issues[0]?.message ?? "Invalid request.",
    issues,
  };
}
