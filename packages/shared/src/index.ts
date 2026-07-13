import { z } from "zod";

export const weightUnitSchema = z.enum(["kg", "lbs"]);
export type WeightUnit = z.infer<typeof weightUnitSchema>;

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

export const exerciseRefSchema = z.object({
  catalogId: z.string().nullable().optional(),
  name: z.string().min(1).max(120),
  gifUrl: z.string().url().nullable().optional(),
  isCustom: z.boolean().default(false),
});
export type ExerciseRef = z.infer<typeof exerciseRefSchema>;

export const trainingDayExerciseSchema = exerciseRefSchema.extend({
  sortOrder: z.number().int().nonnegative(),
  targetSets: z.number().int().positive().optional(),
  targetReps: z.number().int().positive().optional(),
});

export const upsertTrainingDaySchema = z.object({
  name: z.string().min(1).max(80),
  exercises: z.array(trainingDayExerciseSchema).min(1),
});
export type UpsertTrainingDayInput = z.infer<typeof upsertTrainingDaySchema>;

export const setInputSchema = z.object({
  weightKg: z.number().nonnegative(),
  reps: z.number().int().positive(),
});

export const sessionExerciseSchema = z.object({
  catalogId: z.string().nullable().optional(),
  name: z.string().min(1).max(120),
  gifUrl: z.string().url().nullable().optional(),
  isCustom: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative(),
  sets: z.array(setInputSchema).min(1),
});

export const createSessionSchema = z.object({
  trainingDayId: z.string().uuid().nullable().optional(),
  performedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  exercises: z.array(sessionExerciseSchema).min(1),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const linkBuddySchema = z.object({
  inviteCode: z.string().min(4).max(12),
});

export const updateSettingsSchema = z.object({
  weightUnit: weightUnitSchema,
  displayName: z.string().min(1).max(60).optional(),
});

export function volumeForSets(sets: { weightKg: number; reps: number }[]): number {
  return sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
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
