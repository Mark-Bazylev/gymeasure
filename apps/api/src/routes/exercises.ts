import { Router } from "express";
import { requireAuth } from "../middleware/auth";

/**
 * Proxies ExerciseDB free API so the mobile app does not embed the API key.
 * Docs: https://oss.exercisedb.dev/docs
 */
export const exercisesRouter = Router();
exercisesRouter.use(requireAuth);

const BASE = process.env.EXERCISEDB_BASE_URL ?? "https://exercisedb-api-v1.p.rapidapi.com";

exercisesRouter.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.status(400).json({ error: "q required" });

  const apiKey = process.env.EXERCISEDB_API_KEY;
  // Free OSS endpoint variant (no RapidAPI key) when configured
  const ossBase = process.env.EXERCISEDB_OSS_URL ?? "https://exercisedb.dev/api/v1";

  try {
    if (apiKey) {
      const url = `${BASE}/exercises/name/${encodeURIComponent(q)}?limit=20`;
      const response = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": process.env.EXERCISEDB_HOST ?? "exercisedb-api-v1.p.rapidapi.com",
        },
      });
      if (!response.ok) {
        const text = await response.text();
        return res.status(502).json({ error: "ExerciseDB error", detail: text.slice(0, 200) });
      }
      const data = (await response.json()) as unknown;
      const list = Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? [];
      return res.json(
        (list as Record<string, unknown>[]).map((ex) => ({
          catalogId: String(ex.id ?? ex.exerciseId ?? ""),
          name: String(ex.name ?? ""),
          gifUrl: (ex.gifUrl as string) ?? (ex.gif as string) ?? null,
          bodyPart: ex.bodyPart ?? null,
          equipment: ex.equipment ?? null,
          isCustom: false,
        })),
      );
    }

    // OSS search fallback
    const url = `${ossBase}/exercises/search?q=${encodeURIComponent(q)}&limit=20`;
    const response = await fetch(url);
    if (!response.ok) {
      // If remote catalog is down, return empty so custom exercises still work
      return res.json([]);
    }
    const data = (await response.json()) as unknown;
    const list = Array.isArray(data)
      ? data
      : (data as { data?: unknown[]; exercises?: unknown[] }).data ??
        (data as { exercises?: unknown[] }).exercises ??
        [];
    return res.json(
      (list as Record<string, unknown>[]).slice(0, 20).map((ex) => ({
        catalogId: String(ex.id ?? ex.exerciseId ?? ""),
        name: String(ex.name ?? ""),
        gifUrl: (ex.gifUrl as string) ?? (ex.gif as string) ?? null,
        bodyPart: ex.bodyPart ?? null,
        equipment: ex.equipment ?? null,
        isCustom: false,
      })),
    );
  } catch (err) {
    console.error("Exercise search failed", err);
    return res.json([]);
  }
});
