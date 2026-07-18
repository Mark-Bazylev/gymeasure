import { and, eq } from "drizzle-orm";
import { inferLoadingType } from "@gymeasure/shared";
import { db } from "../db/client";
import { exercises } from "../db/schema";
import { isRedistributableLicense } from "./catalogLicense";
import { storeExerciseImage } from "./media";

const WGER_BASE = "https://wger.de/api/v2";
const ENGLISH = 2;

type WgerLicense = {
  id: number;
  full_name?: string;
  short_name?: string;
  url?: string;
};

type WgerImage = {
  id: number;
  image: string;
  is_main?: boolean;
};

type WgerTranslation = {
  id: number;
  name: string;
  description?: string;
  language: number;
};

type WgerExerciseInfo = {
  id: number;
  uuid: string;
  category?: { id: number; name: string };
  equipment?: Array<{ id: number; name: string }>;
  muscles?: Array<{ id: number; name: string; name_en?: string }>;
  muscles_secondary?: Array<{ id: number; name: string; name_en?: string }>;
  images?: WgerImage[];
  translations?: WgerTranslation[];
  license?: WgerLicense;
  license_author?: string | null;
};

function slugify(name: string, sourceId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${base || "exercise"}-${sourceId}`;
}

function pickTranslation(item: WgerExerciseInfo): WgerTranslation | null {
  const translations = item.translations ?? [];
  return translations.find((t) => t.language === ENGLISH && t.name?.trim()) ?? null;
}

function pickImage(item: WgerExerciseInfo): string | null {
  const images = item.images ?? [];
  const main = images.find((i) => i.is_main) ?? images[0];
  return main?.image ?? null;
}

function attributionText(item: WgerExerciseInfo, translation: WgerTranslation): string {
  const license = item.license?.short_name || item.license?.full_name || "Creative Commons";
  const author = item.license_author || "wger contributors";
  return `${translation.name} — ${author} / wger.de (${license})`;
}

export type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
};

export async function importWgerCatalog(options?: {
  maxPages?: number;
  pageSize?: number;
}): Promise<ImportResult> {
  const pageSize = options?.pageSize ?? 100;
  const maxPages = options?.maxPages ?? 100;
  let url: string | null =
    `${WGER_BASE}/exerciseinfo/?language=${ENGLISH}&limit=${pageSize}`;
  let page = 0;
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: 0 };

  while (url && page < maxPages) {
    page += 1;
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "gymeasure-catalog-import/1.0" },
    });
    if (!response.ok) {
      throw new Error(`wger fetch failed: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      next: string | null;
      results: WgerExerciseInfo[];
    };

    for (const item of payload.results) {
      try {
        if (!isRedistributableLicense(item.license)) {
          result.skipped += 1;
          continue;
        }
        const translation = pickTranslation(item);
        if (!translation) {
          result.skipped += 1;
          continue;
        }

        const equipment = (item.equipment ?? []).map((e) => e.name).join(", ") || "none (bodyweight exercise)";
        const muscles = [
          ...(item.muscles ?? []).map((m) => m.name_en || m.name),
          ...(item.muscles_secondary ?? []).map((m) => m.name_en || m.name),
        ]
          .filter(Boolean)
          .join(", ");
        const bodyPart = item.category?.name ?? null;
        const loadingType = inferLoadingType(equipment);
        const sourceId = String(item.id);
        const sourceImage = pickImage(item);
        const imageUrl = sourceImage
          ? await storeExerciseImage(sourceImage, sourceId)
          : null;

        const existing = await db.query.exercises.findFirst({
          where: and(eq(exercises.source, "wger"), eq(exercises.sourceId, sourceId)),
        });

        const row = {
          source: "wger",
          sourceId,
          name: translation.name.trim(),
          slug: slugify(translation.name, sourceId),
          description: translation.description?.replace(/<[^>]+>/g, " ").trim() || null,
          bodyPart,
          equipment,
          muscles: muscles || null,
          loadingType,
          imageUrl: imageUrl ?? existing?.imageUrl ?? null,
          licenseName: item.license?.short_name || item.license?.full_name || null,
          licenseUrl: item.license?.url || null,
          licenseAuthor: item.license_author || null,
          attribution: attributionText(item, translation),
          updatedAt: new Date(),
        };

        if (existing) {
          await db.update(exercises).set(row).where(eq(exercises.id, existing.id));
          result.updated += 1;
        } else {
          await db.insert(exercises).values(row);
          result.imported += 1;
        }
      } catch (err) {
        console.error("catalog import item failed", item.id, err);
        result.errors += 1;
      }
    }

    url = payload.next;
  }

  return result;
}
