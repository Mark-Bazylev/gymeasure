import { Router } from "express";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { effectiveWeightKg, linkBuddySchema, type LoadingType } from "@gymeasure/shared";
import { db } from "../db/client";
import { buddyLinks, sessionExercises, sessions, sets, users } from "../db/schema";
import { normalizeInviteCode, orderedBuddyPair } from "../lib/ids";
import { requireAuth } from "../middleware/auth";

export const buddiesRouter = Router();
buddiesRouter.use(requireAuth);

async function listBuddyUsers(userId: string) {
  const links = await db.query.buddyLinks.findMany({
    where: or(eq(buddyLinks.userAId, userId), eq(buddyLinks.userBId, userId)),
  });
  const buddyIds = links.map((l) => (l.userAId === userId ? l.userBId : l.userAId));
  if (buddyIds.length === 0) return [];
  const result = [];
  for (const id of buddyIds) {
    const buddy = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (buddy) {
      result.push({
        id: buddy.id,
        displayName: buddy.displayName,
        inviteCode: buddy.inviteCode,
        email: buddy.email,
      });
    }
  }
  return result;
}

async function areBuddies(a: string, b: string): Promise<boolean> {
  const [userAId, userBId] = orderedBuddyPair(a, b);
  const link = await db.query.buddyLinks.findFirst({
    where: and(eq(buddyLinks.userAId, userAId), eq(buddyLinks.userBId, userBId)),
  });
  return Boolean(link);
}

buddiesRouter.get("/", async (req, res) => {
  const buddies = await listBuddyUsers(req.user!.id);
  return res.json(buddies);
});

buddiesRouter.post("/link", async (req, res) => {
  const parsed = linkBuddySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const code = normalizeInviteCode(parsed.data.inviteCode);
  const target = await db.query.users.findFirst({ where: eq(users.inviteCode, code) });
  if (!target) return res.status(404).json({ error: "Invite code not found" });
  if (target.id === req.user!.id) {
    return res.status(400).json({ error: "Cannot add yourself as a Gym Buddy" });
  }

  const [userAId, userBId] = orderedBuddyPair(req.user!.id, target.id);
  const existing = await db.query.buddyLinks.findFirst({
    where: and(eq(buddyLinks.userAId, userAId), eq(buddyLinks.userBId, userBId)),
  });
  if (existing) {
    return res.status(409).json({ error: "Already Gym Buddies" });
  }

  await db.insert(buddyLinks).values({ userAId, userBId });
  return res.status(201).json({
    id: target.id,
    displayName: target.displayName,
    inviteCode: target.inviteCode,
    email: target.email,
  });
});

buddiesRouter.get("/:buddyId/profile", async (req, res) => {
  const buddyId = req.params.buddyId!;
  if (!(await areBuddies(req.user!.id, buddyId))) {
    return res.status(403).json({ error: "Not Gym Buddies" });
  }
  const buddy = await db.query.users.findFirst({ where: eq(users.id, buddyId) });
  if (!buddy) return res.status(404).json({ error: "User not found" });

  const recentSessions = await db.query.sessions.findMany({
    where: and(eq(sessions.userId, buddyId), eq(sessions.status, "completed")),
    orderBy: [desc(sessions.performedAt)],
    limit: 20,
  });
  const detailed = [];
  for (const session of recentSessions) {
    const exerciseRows = await db.query.sessionExercises.findMany({
      where: eq(sessionExercises.sessionId, session.id),
      orderBy: [asc(sessionExercises.sortOrder)],
    });
    detailed.push({
      id: session.id,
      performedAt: session.performedAt,
      notes: session.notes,
      exercises: exerciseRows.map((e) => ({
        id: e.id,
        name: e.name,
        exerciseId: e.exerciseId,
        imageUrl: e.imageUrl,
        loadingType: e.loadingType,
      })),
    });
  }

  return res.json({
    id: buddy.id,
    displayName: buddy.displayName,
    inviteCode: buddy.inviteCode,
    sessions: detailed,
  });
});

buddiesRouter.get("/:buddyId/compare", async (req, res) => {
  const buddyId = req.params.buddyId!;
  if (!(await areBuddies(req.user!.id, buddyId))) {
    return res.status(403).json({ error: "Not Gym Buddies" });
  }
  const exerciseId =
    typeof req.query.exerciseId === "string"
      ? req.query.exerciseId
      : typeof req.query.catalogId === "string"
        ? req.query.catalogId
        : null;
  const name = typeof req.query.name === "string" ? req.query.name : null;
  if (!exerciseId && !name) {
    return res.status(400).json({ error: "exerciseId or name required" });
  }

  async function volumeSeries(userId: string) {
    const exerciseFilter = exerciseId
      ? eq(sessionExercises.exerciseId, exerciseId)
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
      .where(and(eq(sessions.userId, userId), eq(sessions.status, "completed"), exerciseFilter))
      .orderBy(asc(sessions.performedAt));

    const bySession = new Map<string, { date: string; volume: number }>();
    for (const row of rows) {
      if (row.status !== "completed" || row.reps == null || row.weightKg == null) continue;
      const key = row.sessionId;
      const current = bySession.get(key) ?? {
        date: row.performedAt.toISOString(),
        volume: 0,
      };
      current.volume +=
        effectiveWeightKg({
          loadingType: row.loadingType as LoadingType,
          weightKg: Number(row.weightKg),
          bodyweightKg: row.bodyweightKg != null ? Number(row.bodyweightKg) : null,
        }) * row.reps;
      bySession.set(key, current);
    }
    return Array.from(bySession.values());
  }

  const me = await db.query.users.findFirst({ where: eq(users.id, req.user!.id) });
  const buddy = await db.query.users.findFirst({ where: eq(users.id, buddyId) });
  const [myPoints, buddyPoints] = await Promise.all([
    volumeSeries(req.user!.id),
    volumeSeries(buddyId),
  ]);

  return res.json({
    exercise: { exerciseId, catalogId: exerciseId, name },
    me: { id: me?.id, displayName: me?.displayName, points: myPoints },
    buddy: { id: buddy?.id, displayName: buddy?.displayName, points: buddyPoints },
  });
});
