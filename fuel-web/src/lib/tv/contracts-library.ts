/** Contracts for videos, programs and TV pairing. See contracts.ts for schedules and broadcasts. */
import { z } from "zod";

import { intensitySchema } from "./contracts";

const idSchema = z.string().min(1).max(64);

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

// ---------------- Videos ----------------

export const videoCreateSchema = z.object({
  name: z.string().trim().min(1, "Enter a workout name.").max(120),
  videoUrl: z.string().trim().min(1, "A video URL is required.").max(2048),
  thumbnailUrl: nullableText(2048),
  durationSeconds: z.number().int().min(1).max(86_400),
});

export const videoPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    thumbnailUrl: z.string().trim().max(2048).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update.",
  });

export const videoQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  active: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

// ---------------- Programs ----------------

export const programCreateSchema = z.object({
  name: z.string().trim().min(1, "Enter a program title.").max(120),
  subtitle: nullableText(160),
  description: nullableText(1000),
  intensity: intensitySchema.nullable().optional().transform((v) => v ?? null),
  videoIds: z.array(idSchema).min(1, "Select at least one exercise.").max(100),
});

export const programPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    subtitle: z.string().trim().max(160).nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    intensity: intensitySchema.nullable().optional(),
    isActive: z.boolean().optional(),
    videoIds: z.array(idSchema).min(1).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update.",
  });

// ---------------- TVs ----------------

export const tvPairSchema = z.object({
  pairingCode: z
    .string()
    .trim()
    .length(6, "Pairing codes have 6 characters.")
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, "Name the TV.").max(80),
  branchId: idSchema,
});

export const tvQuerySchema = z.object({
  branchId: idSchema.optional(),
});
