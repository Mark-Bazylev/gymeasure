import { Router } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { upsertTrainingDaySchema } from "@gymeasure/shared";
import { db } from "../db/client";
import {
  exercises,
  trainingDayExercises,
  trainingDayPlannedSets,
  trainingDays,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";

export const trainingDaysRouter = Router();
trainingDaysRouter.use(requireAuth);

async function loadDay(userId: string, dayId: string) {
  const day = await db.query.trainingDays.findFirst({
    where: and(eq(trainingDays.id, dayId), eq(trainingDays.userId, userId)),
  });
  if (!day) return null;

  const dayExercises = await db.query.trainingDayExercises.findMany({
    where: eq(trainingDayExercises.trainingDayId, day.id),
    orderBy: [asc(trainingDayExercises.sortOrder)],
  });

  const exerciseIds = dayExercises.map((e) => e.exerciseId);
  const catalog =
    exerciseIds.length > 0
      ? await db.query.exercises.findMany({ where: inArray(exercises.id, exerciseIds) })
      : [];
  const catalogById = new Map(catalog.map((e) => [e.id, e]));

  const mapped = [];
  for (const ex of dayExercises) {
    const planned = await db.query.trainingDayPlannedSets.findMany({
      where: eq(trainingDayPlannedSets.trainingDayExerciseId, ex.id),
      orderBy: [asc(trainingDayPlannedSets.sortOrder)],
    });
    const cat = catalogById.get(ex.exerciseId);
    if (!cat) continue;
    mapped.push({
      id: ex.id,
      exerciseId: ex.exerciseId,
      sortOrder: ex.sortOrder,
      name: cat.name,
      imageUrl: cat.imageUrl,
      loadingType: cat.loadingType,
      bodyPart: cat.bodyPart,
      equipment: cat.equipment,
      attribution: cat.attribution,
      plannedSets: planned.map((s) => ({
        id: s.id,
        sortOrder: s.sortOrder,
        reps: s.reps,
        weightKg: Number(s.weightKg),
      })),
    });
  }

  return { ...day, exercises: mapped };
}

async function replaceExercises(
  dayId: string,
  items: Array<{
    exerciseId: string;
    sortOrder: number;
    plannedSets: Array<{ sortOrder: number; reps: number; weightKg: number }>;
  }>,
) {
  const catalogIds = items.map((i) => i.exerciseId);
  const found = await db.query.exercises.findMany({ where: inArray(exercises.id, catalogIds) });
  if (found.length !== new Set(catalogIds).size) {
    throw new Error("One or more exercises were not found in the catalog");
  }

  await db.delete(trainingDayExercises).where(eq(trainingDayExercises.trainingDayId, dayId));

  for (const item of items) {
    const [row] = await db
      .insert(trainingDayExercises)
      .values({
        trainingDayId: dayId,
        exerciseId: item.exerciseId,
        sortOrder: item.sortOrder,
      })
      .returning();
    if (!row) continue;
    await db.insert(trainingDayPlannedSets).values(
      item.plannedSets.map((s) => ({
        trainingDayExerciseId: row.id,
        sortOrder: s.sortOrder,
        reps: s.reps,
        weightKg: String(s.weightKg),
      })),
    );
  }
}

trainingDaysRouter.get("/", async (req, res) => {
  const days = await db.query.trainingDays.findMany({
    where: eq(trainingDays.userId, req.user!.id),
    orderBy: [asc(trainingDays.name)],
  });
  const result = [];
  for (const day of days) {
    const full = await loadDay(req.user!.id, day.id);
    if (full) result.push(full);
  }
  return res.json(result);
});

trainingDaysRouter.get("/:id", async (req, res) => {
  const day = await loadDay(req.user!.id, req.params.id!);
  if (!day) return res.status(404).json({ error: "Training day not found" });
  return res.json(day);
});

trainingDaysRouter.post("/", async (req, res) => {
  const parsed = upsertTrainingDaySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, exercises: items } = parsed.data;
  const [day] = await db
    .insert(trainingDays)
    .values({ userId: req.user!.id, name })
    .returning();
  if (!day) return res.status(500).json({ error: "Failed to create training day" });

  try {
    await replaceExercises(day.id, items);
  } catch (err) {
    await db.delete(trainingDays).where(eq(trainingDays.id, day.id));
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid exercises" });
  }

  const full = await loadDay(req.user!.id, day.id);
  return res.status(201).json(full);
});

trainingDaysRouter.put("/:id", async (req, res) => {
  const parsed = upsertTrainingDaySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const existing = await db.query.trainingDays.findFirst({
    where: and(eq(trainingDays.id, req.params.id!), eq(trainingDays.userId, req.user!.id)),
  });
  if (!existing) return res.status(404).json({ error: "Training day not found" });

  await db
    .update(trainingDays)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(trainingDays.id, existing.id));

  try {
    await replaceExercises(existing.id, parsed.data.exercises);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid exercises" });
  }

  const full = await loadDay(req.user!.id, existing.id);
  return res.json(full);
});

trainingDaysRouter.delete("/:id", async (req, res) => {
  const existing = await db.query.trainingDays.findFirst({
    where: and(eq(trainingDays.id, req.params.id!), eq(trainingDays.userId, req.user!.id)),
  });
  if (!existing) return res.status(404).json({ error: "Training day not found" });
  await db.delete(trainingDays).where(eq(trainingDays.id, existing.id));
  return res.status(204).send();
});
