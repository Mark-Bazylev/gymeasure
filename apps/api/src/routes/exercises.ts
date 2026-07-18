import { Router } from "express";
import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { exercises } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { importWgerCatalog } from "../lib/catalogImport";

export const exercisesRouter = Router();
exercisesRouter.use(requireAuth);

function publicExercise(row: typeof exercises.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    bodyPart: row.bodyPart,
    equipment: row.equipment,
    muscles: row.muscles,
    loadingType: row.loadingType,
    imageUrl: row.imageUrl,
    attribution: row.attribution,
    licenseName: row.licenseName,
    licenseAuthor: row.licenseAuthor,
  };
}

exercisesRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const bodyPart = typeof req.query.bodyPart === "string" ? req.query.bodyPart.trim() : "";
  const equipment = typeof req.query.equipment === "string" ? req.query.equipment.trim() : "";
  const limit = Math.min(Number(req.query.limit ?? 40) || 40, 100);
  const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

  const filters = [];
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(exercises.name, pattern),
        ilike(exercises.muscles, pattern),
        ilike(exercises.equipment, pattern),
        ilike(exercises.bodyPart, pattern),
      )!,
    );
  }
  if (bodyPart) filters.push(ilike(exercises.bodyPart, bodyPart));
  if (equipment) filters.push(ilike(exercises.equipment, `%${equipment}%`));

  const where = filters.length ? and(...filters) : undefined;

  const [totalRow] = await db.select({ value: count() }).from(exercises).where(where);
  const rows = await db
    .select()
    .from(exercises)
    .where(where)
    .orderBy(asc(exercises.name))
    .limit(limit)
    .offset(offset);

  return res.json({
    total: totalRow?.value ?? 0,
    items: rows.map(publicExercise),
  });
});

exercisesRouter.get("/filters", async (_req, res) => {
  const bodyParts = await db
    .selectDistinct({ value: exercises.bodyPart })
    .from(exercises)
    .where(sql`${exercises.bodyPart} is not null`)
    .orderBy(asc(exercises.bodyPart));
  const equipmentRows = await db
    .selectDistinct({ value: exercises.equipment })
    .from(exercises)
    .where(sql`${exercises.equipment} is not null`)
    .orderBy(asc(exercises.equipment));

  return res.json({
    bodyParts: bodyParts.map((r) => r.value).filter(Boolean),
    equipment: equipmentRows.map((r) => r.value).filter(Boolean),
  });
});

exercisesRouter.get("/:id", async (req, res) => {
  const row = await db.query.exercises.findFirst({
    where: eq(exercises.id, req.params.id!),
  });
  if (!row) return res.status(404).json({ error: "Exercise not found" });
  return res.json(publicExercise(row));
});

/** Admin/dev endpoint — protected by shared auth; intended for operators. */
exercisesRouter.post("/import", async (req, res) => {
  if (process.env.ALLOW_CATALOG_IMPORT !== "true") {
    return res.status(403).json({ error: "Catalog import disabled" });
  }
  const result = await importWgerCatalog({
    maxPages: typeof req.body?.maxPages === "number" ? req.body.maxPages : undefined,
  });
  return res.json(result);
});
