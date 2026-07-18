import { z } from "zod";

export const weightUnitSchema = z.enum(["kg", "lbs"]);
export type WeightUnit = z.infer<typeof weightUnitSchema>;

export const loadingTypeSchema = z.enum(["external", "bodyweight", "assisted"]);
export type LoadingType = z.infer<typeof loadingTypeSchema>;

export const setStatusSchema = z.enum(["pending", "completed", "skipped"]);
export type SetStatus = z.infer<typeof setStatusSchema>;

export const sessionStatusSchema = z.enum(["active", "completed"]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(60),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const plannedSetSchema = z.object({
  sortOrder: z.number().int().nonnegative(),
  reps: z.number().int().positive(),
  /** External load kg, added load for bodyweight, or assistance kg for assisted. */
  weightKg: z.number().nonnegative(),
});
export type PlannedSetInput = z.infer<typeof plannedSetSchema>;

export const trainingDayExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  sortOrder: z.number().int().nonnegative(),
  plannedSets: z.array(plannedSetSchema).min(1),
});
export type TrainingDayExerciseInput = z.infer<typeof trainingDayExerciseSchema>;

export const upsertTrainingDaySchema = z.object({
  name: z.string().min(1).max(80),
  exercises: z.array(trainingDayExerciseSchema).min(1),
});
export type UpsertTrainingDayInput = z.infer<typeof upsertTrainingDaySchema>;

export const sessionSetSchema = z.object({
  id: z.string().uuid().optional(),
  sortOrder: z.number().int().nonnegative(),
  status: setStatusSchema,
  plannedReps: z.number().int().positive().nullable().optional(),
  plannedWeightKg: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().positive().nullable().optional(),
  weightKg: z.number().nonnegative().nullable().optional(),
  isExtra: z.boolean().default(false),
});
export type SessionSetInput = z.infer<typeof sessionSetSchema>;

export const sessionExerciseSchema = z.object({
  id: z.string().uuid().optional(),
  exerciseId: z.string().uuid(),
  sortOrder: z.number().int().nonnegative(),
  sets: z.array(sessionSetSchema).min(1),
});
export type SessionExerciseInput = z.infer<typeof sessionExerciseSchema>;

export const startSessionSchema = z.object({
  trainingDayId: z.string().uuid(),
  performedAt: z.string().datetime().optional(),
  bodyweightKg: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const updateSessionSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
  bodyweightKg: z.number().positive().optional(),
  performedAt: z.string().datetime().optional(),
  exercises: z.array(sessionExerciseSchema).min(1),
});
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const completeSessionSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
  performedAt: z.string().datetime().optional(),
  /** When true, any remaining pending planned sets become completed with planned values. */
  completeRemainingAsPlanned: z.boolean().optional(),
  exercises: z.array(sessionExerciseSchema).min(1).optional(),
});
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;

export const linkBuddySchema = z.object({
  inviteCode: z.string().min(4).max(12),
});

export const updateSettingsSchema = z.object({
  weightUnit: weightUnitSchema.optional(),
  displayName: z.string().min(1).max(60).optional(),
  bodyweightKg: z.number().positive().max(500).optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/** Effective resistance used for Volume. */
export function effectiveWeightKg(params: {
  loadingType: LoadingType;
  weightKg: number;
  bodyweightKg: number | null | undefined;
}): number {
  const { loadingType, weightKg, bodyweightKg } = params;
  if (loadingType === "external") return weightKg;
  const bw = bodyweightKg ?? 0;
  if (loadingType === "bodyweight") return Math.max(0, bw + weightKg);
  return Math.max(0, bw - weightKg);
}

export function volumeForSets(
  sets: Array<{
    weightKg: number;
    reps: number;
    status?: SetStatus;
    loadingType?: LoadingType;
    bodyweightKg?: number | null;
  }>,
  defaults?: { loadingType?: LoadingType; bodyweightKg?: number | null },
): number {
  return sets.reduce((sum, s) => {
    if (s.status && s.status !== "completed") return sum;
    const loadingType = s.loadingType ?? defaults?.loadingType ?? "external";
    const bodyweightKg = s.bodyweightKg ?? defaults?.bodyweightKg ?? null;
    const w = effectiveWeightKg({ loadingType, weightKg: s.weightKg, bodyweightKg });
    return sum + w * s.reps;
  }, 0);
}

export const KG_PER_LB = 0.45359237;

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  if (unit === "kg") return kg;
  return kg / KG_PER_LB;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  if (unit === "kg") return value;
  return value * KG_PER_LB;
}

export function inferLoadingType(equipment: string | null | undefined): LoadingType {
  const e = (equipment ?? "").toLowerCase();
  if (!e || e.includes("none") || e.includes("bodyweight") || e.includes("body weight")) {
    return "bodyweight";
  }
  if (e.includes("assisted") || e.includes("pull-up machine") || e.includes("pull up machine")) {
    return "assisted";
  }
  return "external";
}
