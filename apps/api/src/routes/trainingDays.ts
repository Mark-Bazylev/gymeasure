import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { upsertTrainingDaySchema } from "@gymeasure/shared";
import { db } from "../db/client";
import { trainingDayExercises, trainingDays } from "../db/schema";
import { requireAuth } from "../middleware/auth";

export const trainingDaysRouter = Router();
trainingDaysRouter.use(requireAuth);

async function loadDay(userId: string, dayId: string) {
  const day = await db.query.trainingDays.findFirst({
    where: and(eq(trainingDays.id, dayId), eq(trainingDays.userId, userId)),
  });
  if (!day) return null;
  const exercises = await db.query.trainingDayExercises.findMany({
    where: eq(trainingDayExercises.trainingDayId, day.id),
    orderBy: [asc(trainingDayExercises.sortOrder)],
  });
  return { ...day, exercises };
}

trainingDaysRouter.get("/", async (req, res) => {
  const days = await db.query.trainingDays.findMany({
    where: eq(trainingDays.userId, req.user!.id),
    orderBy: [asc(trainingDays.name)],
  });
  const result = [];
  for (const day of days) {
    const exercises = await db.query.trainingDayExercises.findMany({
      where: eq(trainingDayExercises.trainingDayId, day.id),
      orderBy: [asc(trainingDayExercises.sortOrder)],
    });
    result.push({ ...day, exercises });
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
  const { name, exercises } = parsed.data;
  const [day] = await db
    .insert(trainingDays)
    .values({ userId: req.user!.id, name })
    .returning();
  if (!day) return res.status(500).json({ error: "Failed to create training day" });

  await db.insert(trainingDayExercises).values(
    exercises.map((ex) => ({
      trainingDayId: day.id,
      catalogId: ex.catalogId ?? null,
      name: ex.name,
      gifUrl: ex.gifUrl ?? null,
      isCustom: ex.isCustom ?? false,
      sortOrder: ex.sortOrder,
      targetSets: ex.targetSets ?? null,
      targetReps: ex.targetReps ?? null,
    })),
  );

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
  await db.delete(trainingDayExercises).where(eq(trainingDayExercises.trainingDayId, existing.id));
  await db.insert(trainingDayExercises).values(
    parsed.data.exercises.map((ex) => ({
      trainingDayId: existing.id,
      catalogId: ex.catalogId ?? null,
      name: ex.name,
      gifUrl: ex.gifUrl ?? null,
      isCustom: ex.isCustom ?? false,
      sortOrder: ex.sortOrder,
      targetSets: ex.targetSets ?? null,
      targetReps: ex.targetReps ?? null,
    })),
  );

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
