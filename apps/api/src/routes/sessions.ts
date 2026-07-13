import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { createSessionSchema, volumeForSets } from "@gymeasure/shared";
import { db } from "../db/client";
import { sessionExercises, sessions, sets } from "../db/schema";
import { requireAuth } from "../middleware/auth";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

async function loadSession(userId: string, sessionId: string) {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, userId)),
  });
  if (!session) return null;
  const exercises = await db.query.sessionExercises.findMany({
    where: eq(sessionExercises.sessionId, session.id),
    orderBy: [asc(sessionExercises.sortOrder)],
  });
  const withSets = [];
  for (const ex of exercises) {
    const setRows = await db.query.sets.findMany({
      where: eq(sets.sessionExerciseId, ex.id),
      orderBy: [asc(sets.sortOrder)],
    });
    const mapped = setRows.map((s) => ({
      id: s.id,
      weightKg: Number(s.weightKg),
      reps: s.reps,
      sortOrder: s.sortOrder,
    }));
    withSets.push({
      ...ex,
      sets: mapped,
      volume: volumeForSets(mapped),
    });
  }
  return { ...session, exercises: withSets };
}

sessionsRouter.get("/", async (req, res) => {
  const rows = await db.query.sessions.findMany({
    where: eq(sessions.userId, req.user!.id),
    orderBy: [desc(sessions.performedAt)],
    limit: 50,
  });
  const result = [];
  for (const session of rows) {
    const full = await loadSession(req.user!.id, session.id);
    if (full) result.push(full);
  }
  return res.json(result);
});

/** Personal volume series for one exercise (by catalogId or exact name). */
sessionsRouter.get("/stats/volume", async (req, res) => {
  const catalogId = typeof req.query.catalogId === "string" ? req.query.catalogId : null;
  const name = typeof req.query.name === "string" ? req.query.name : null;
  if (!catalogId && !name) {
    return res.status(400).json({ error: "catalogId or name required" });
  }

  const exerciseFilter = catalogId
    ? eq(sessionExercises.catalogId, catalogId)
    : eq(sessionExercises.name, name!);

  const rows = await db
    .select({
      performedAt: sessions.performedAt,
      sessionId: sessions.id,
      weightKg: sets.weightKg,
      reps: sets.reps,
    })
    .from(sessions)
    .innerJoin(sessionExercises, eq(sessionExercises.sessionId, sessions.id))
    .innerJoin(sets, eq(sets.sessionExerciseId, sessionExercises.id))
    .where(and(eq(sessions.userId, req.user!.id), exerciseFilter))
    .orderBy(asc(sessions.performedAt));

  const bySession = new Map<string, { date: string; volume: number }>();
  for (const row of rows) {
    const key = row.sessionId;
    const current = bySession.get(key) ?? {
      date: row.performedAt.toISOString(),
      volume: 0,
    };
    current.volume += Number(row.weightKg) * row.reps;
    bySession.set(key, current);
  }

  return res.json({ points: Array.from(bySession.values()) });
});

sessionsRouter.get("/:id", async (req, res) => {
  const full = await loadSession(req.user!.id, req.params.id!);
  if (!full) return res.status(404).json({ error: "Session not found" });
  return res.json(full);
});

sessionsRouter.post("/", async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { trainingDayId, performedAt, notes, exercises } = parsed.data;

  const [session] = await db
    .insert(sessions)
    .values({
      userId: req.user!.id,
      trainingDayId: trainingDayId ?? null,
      performedAt: performedAt ? new Date(performedAt) : new Date(),
      notes: notes ?? null,
    })
    .returning();
  if (!session) return res.status(500).json({ error: "Failed to create session" });

  for (const ex of exercises) {
    const [sessionEx] = await db
      .insert(sessionExercises)
      .values({
        sessionId: session.id,
        catalogId: ex.catalogId ?? null,
        name: ex.name,
        gifUrl: ex.gifUrl ?? null,
        isCustom: ex.isCustom ?? false,
        sortOrder: ex.sortOrder,
      })
      .returning();
    if (!sessionEx) continue;
    await db.insert(sets).values(
      ex.sets.map((s, i) => ({
        sessionExerciseId: sessionEx.id,
        weightKg: String(s.weightKg),
        reps: s.reps,
        sortOrder: i,
      })),
    );
  }

  const full = await loadSession(req.user!.id, session.id);
  return res.status(201).json(full);
});

sessionsRouter.delete("/:id", async (req, res) => {
  const existing = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, req.params.id!), eq(sessions.userId, req.user!.id)),
  });
  if (!existing) return res.status(404).json({ error: "Session not found" });
  await db.delete(sessions).where(eq(sessions.id, existing.id));
  return res.status(204).send();
});
