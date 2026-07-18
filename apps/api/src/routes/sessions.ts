import { Router } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  completeSessionSchema,
  effectiveWeightKg,
  startSessionSchema,
  updateSessionSchema,
  volumeForSets,
  type LoadingType,
  type SetStatus,
} from "@gymeasure/shared";
import { db } from "../db/client";
import {
  exercises,
  sessionExercises,
  sessions,
  sets,
  trainingDayExercises,
  trainingDayPlannedSets,
  trainingDays,
  users,
} from "../db/schema";
import { requireAuth } from "../middleware/auth";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

async function loadSession(userId: string, sessionId: string) {
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), eq(sessions.userId, userId)),
  });
  if (!session) return null;

  const exRows = await db.query.sessionExercises.findMany({
    where: eq(sessionExercises.sessionId, session.id),
    orderBy: [asc(sessionExercises.sortOrder)],
  });

  const bodyweightKg = session.bodyweightKg != null ? Number(session.bodyweightKg) : null;
  const withSets = [];
  for (const ex of exRows) {
    const setRows = await db.query.sets.findMany({
      where: eq(sets.sessionExerciseId, ex.id),
      orderBy: [asc(sets.sortOrder)],
    });
    const mapped = setRows.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      status: s.status as SetStatus,
      plannedReps: s.plannedReps,
      plannedWeightKg: s.plannedWeightKg != null ? Number(s.plannedWeightKg) : null,
      reps: s.reps,
      weightKg: s.weightKg != null ? Number(s.weightKg) : null,
      isExtra: s.isExtra,
    }));
    const completed = mapped
      .filter((s) => s.status === "completed" && s.reps != null && s.weightKg != null)
      .map((s) => ({
        weightKg: s.weightKg!,
        reps: s.reps!,
        status: s.status,
        loadingType: ex.loadingType as LoadingType,
        bodyweightKg,
      }));
    withSets.push({
      id: ex.id,
      exerciseId: ex.exerciseId,
      name: ex.name,
      imageUrl: ex.imageUrl,
      loadingType: ex.loadingType,
      sortOrder: ex.sortOrder,
      sets: mapped,
      volume: volumeForSets(completed),
    });
  }

  return {
    ...session,
    bodyweightKg,
    exercises: withSets,
    totalVolume: withSets.reduce((sum, e) => sum + e.volume, 0),
  };
}

async function replaceSessionExercises(
  sessionId: string,
  items: Array<{
    id?: string;
    exerciseId: string;
    sortOrder: number;
    sets: Array<{
      id?: string;
      sortOrder: number;
      status: SetStatus;
      plannedReps?: number | null;
      plannedWeightKg?: number | null;
      reps?: number | null;
      weightKg?: number | null;
      isExtra?: boolean;
    }>;
  }>,
) {
  const catalogIds = items.map((i) => i.exerciseId);
  const catalog = await db.query.exercises.findMany({ where: inArray(exercises.id, catalogIds) });
  const byId = new Map(catalog.map((e) => [e.id, e]));
  if (byId.size !== new Set(catalogIds).size) {
    throw new Error("One or more exercises were not found in the catalog");
  }

  await db.delete(sessionExercises).where(eq(sessionExercises.sessionId, sessionId));

  for (const item of items) {
    const cat = byId.get(item.exerciseId)!;
    const [exRow] = await db
      .insert(sessionExercises)
      .values({
        sessionId,
        exerciseId: item.exerciseId,
        name: cat.name,
        imageUrl: cat.imageUrl,
        loadingType: cat.loadingType,
        sortOrder: item.sortOrder,
      })
      .returning();
    if (!exRow) continue;

    await db.insert(sets).values(
      item.sets.map((s) => ({
        sessionExerciseId: exRow.id,
        sortOrder: s.sortOrder,
        status: s.status,
        plannedReps: s.plannedReps ?? null,
        plannedWeightKg: s.plannedWeightKg != null ? String(s.plannedWeightKg) : null,
        reps: s.reps ?? null,
        weightKg: s.weightKg != null ? String(s.weightKg) : null,
        isExtra: s.isExtra ?? false,
      })),
    );
  }
}

sessionsRouter.get("/active", async (req, res) => {
  const active = await db.query.sessions.findFirst({
    where: and(eq(sessions.userId, req.user!.id), eq(sessions.status, "active")),
    orderBy: [desc(sessions.updatedAt)],
  });
  if (!active) return res.json(null);
  return res.json(await loadSession(req.user!.id, active.id));
});

sessionsRouter.get("/", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const rows = await db.query.sessions.findMany({
    where: status
      ? and(eq(sessions.userId, req.user!.id), eq(sessions.status, status))
      : eq(sessions.userId, req.user!.id),
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

sessionsRouter.get("/stats/volume", async (req, res) => {
  const exerciseId = typeof req.query.exerciseId === "string" ? req.query.exerciseId : null;
  const catalogId = typeof req.query.catalogId === "string" ? req.query.catalogId : null;
  const name = typeof req.query.name === "string" ? req.query.name : null;
  const targetId = exerciseId || catalogId;
  if (!targetId && !name) {
    return res.status(400).json({ error: "exerciseId or name required" });
  }

  const exerciseFilter = targetId
    ? eq(sessionExercises.exerciseId, targetId)
    : eq(sessionExercises.name, name!);

  const rows = await db
    .select({
      performedAt: sessions.performedAt,
      sessionId: sessions.id,
      bodyweightKg: sessions.bodyweightKg,
      loadingType: sessionExercises.loadingType,
      weightKg: sets.weightKg,
      reps: sets.reps,
      status: sets.status,
    })
    .from(sessions)
    .innerJoin(sessionExercises, eq(sessionExercises.sessionId, sessions.id))
    .innerJoin(sets, eq(sets.sessionExerciseId, sessionExercises.id))
    .where(and(eq(sessions.userId, req.user!.id), eq(sessions.status, "completed"), exerciseFilter))
    .orderBy(asc(sessions.performedAt));

  const bySession = new Map<string, { date: string; volume: number }>();
  for (const row of rows) {
    if (row.status !== "completed" || row.reps == null || row.weightKg == null) continue;
    const key = row.sessionId;
    const current = bySession.get(key) ?? {
      date: row.performedAt.toISOString(),
      volume: 0,
    };
    const effective = effectiveWeightKg({
      loadingType: row.loadingType as LoadingType,
      weightKg: Number(row.weightKg),
      bodyweightKg: row.bodyweightKg != null ? Number(row.bodyweightKg) : null,
    });
    current.volume += effective * row.reps;
    bySession.set(key, current);
  }

  return res.json({ points: Array.from(bySession.values()) });
});

sessionsRouter.get("/:id", async (req, res) => {
  const full = await loadSession(req.user!.id, req.params.id!);
  if (!full) return res.status(404).json({ error: "Session not found" });
  return res.json(full);
});

sessionsRouter.post("/start", async (req, res) => {
  const parsed = startSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existingActive = await db.query.sessions.findFirst({
    where: and(eq(sessions.userId, req.user!.id), eq(sessions.status, "active")),
  });
  if (existingActive) {
    return res.status(409).json({
      error: "An active Session already exists. Resume or discard it first.",
      activeSessionId: existingActive.id,
    });
  }

  const day = await db.query.trainingDays.findFirst({
    where: and(
      eq(trainingDays.id, parsed.data.trainingDayId),
      eq(trainingDays.userId, req.user!.id),
    ),
  });
  if (!day) return res.status(404).json({ error: "Training day not found" });

  const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.id) });
  const bodyweightKg =
    parsed.data.bodyweightKg ??
    (user?.bodyweightKg != null ? Number(user.bodyweightKg) : null);

  const dayExercises = await db.query.trainingDayExercises.findMany({
    where: eq(trainingDayExercises.trainingDayId, day.id),
    orderBy: [asc(trainingDayExercises.sortOrder)],
  });
  if (dayExercises.length === 0) {
    return res.status(400).json({ error: "Training day has no exercises" });
  }

  const [session] = await db
    .insert(sessions)
    .values({
      userId: req.user!.id,
      trainingDayId: day.id,
      status: "active",
      performedAt: parsed.data.performedAt ? new Date(parsed.data.performedAt) : new Date(),
      bodyweightKg: bodyweightKg != null ? String(bodyweightKg) : null,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  if (!session) return res.status(500).json({ error: "Failed to start session" });

  for (const dayEx of dayExercises) {
    const cat = await db.query.exercises.findFirst({ where: eq(exercises.id, dayEx.exerciseId) });
    if (!cat) continue;
    const planned = await db.query.trainingDayPlannedSets.findMany({
      where: eq(trainingDayPlannedSets.trainingDayExerciseId, dayEx.id),
      orderBy: [asc(trainingDayPlannedSets.sortOrder)],
    });
    const [sessionEx] = await db
      .insert(sessionExercises)
      .values({
        sessionId: session.id,
        exerciseId: cat.id,
        name: cat.name,
        imageUrl: cat.imageUrl,
        loadingType: cat.loadingType,
        sortOrder: dayEx.sortOrder,
      })
      .returning();
    if (!sessionEx) continue;
    await db.insert(sets).values(
      planned.map((s) => ({
        sessionExerciseId: sessionEx.id,
        sortOrder: s.sortOrder,
        status: "pending",
        plannedReps: s.reps,
        plannedWeightKg: s.weightKg,
        reps: s.reps,
        weightKg: s.weightKg,
        isExtra: false,
      })),
    );
  }

  return res.status(201).json(await loadSession(req.user!.id, session.id));
});

sessionsRouter.put("/:id", async (req, res) => {
  const parsed = updateSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const existing = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, req.params.id!), eq(sessions.userId, req.user!.id)),
  });
  if (!existing) return res.status(404).json({ error: "Session not found" });

  await db
    .update(sessions)
    .set({
      updatedAt: new Date(),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.bodyweightKg != null
        ? { bodyweightKg: String(parsed.data.bodyweightKg) }
        : {}),
      ...(parsed.data.performedAt ? { performedAt: new Date(parsed.data.performedAt) } : {}),
    })
    .where(eq(sessions.id, existing.id));

  try {
    await replaceSessionExercises(existing.id, parsed.data.exercises);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid session" });
  }

  return res.json(await loadSession(req.user!.id, existing.id));
});

sessionsRouter.post("/:id/complete", async (req, res) => {
  const parsed = completeSessionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const existing = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, req.params.id!), eq(sessions.userId, req.user!.id)),
  });
  if (!existing) return res.status(404).json({ error: "Session not found" });

  if (parsed.data.exercises) {
    try {
      await replaceSessionExercises(existing.id, parsed.data.exercises);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid session" });
    }
  }

  if (parsed.data.completeRemainingAsPlanned) {
    const exRows = await db.query.sessionExercises.findMany({
      where: eq(sessionExercises.sessionId, existing.id),
    });
    for (const ex of exRows) {
      const setRows = await db.query.sets.findMany({
        where: and(eq(sets.sessionExerciseId, ex.id), eq(sets.status, "pending")),
      });
      for (const s of setRows) {
        await db
          .update(sets)
          .set({
            status: "completed",
            reps: s.reps ?? s.plannedReps,
            weightKg: s.weightKg ?? s.plannedWeightKg,
          })
          .where(eq(sets.id, s.id));
      }
    }
  }

  // Mark any remaining pending non-extra planned sets as skipped.
  const exRows = await db.query.sessionExercises.findMany({
    where: eq(sessionExercises.sessionId, existing.id),
  });
  for (const ex of exRows) {
    await db
      .update(sets)
      .set({ status: "skipped" })
      .where(
        and(eq(sets.sessionExerciseId, ex.id), eq(sets.status, "pending"), eq(sets.isExtra, false)),
      );
    // Drop unused extra pending sets.
    await db
      .delete(sets)
      .where(
        and(eq(sets.sessionExerciseId, ex.id), eq(sets.status, "pending"), eq(sets.isExtra, true)),
      );
  }

  await db
    .update(sessions)
    .set({
      status: "completed",
      updatedAt: new Date(),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.performedAt ? { performedAt: new Date(parsed.data.performedAt) } : {}),
    })
    .where(eq(sessions.id, existing.id));

  return res.json(await loadSession(req.user!.id, existing.id));
});

sessionsRouter.delete("/:id", async (req, res) => {
  const existing = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, req.params.id!), eq(sessions.userId, req.user!.id)),
  });
  if (!existing) return res.status(404).json({ error: "Session not found" });
  await db.delete(sessions).where(eq(sessions.id, existing.id));
  return res.status(204).send();
});
