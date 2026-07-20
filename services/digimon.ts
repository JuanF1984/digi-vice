import {
  fetchDigimonByName,
  fetchDigimonListPage,
  DigimonNotFoundError,
} from "@/lib/digimon/api";
import { normalizeDigimon, toCardData } from "@/lib/digimon/normalize";
import { DIGIMON_PAGE_SIZE } from "@/lib/digimon/constants";
import {
  CURATED_SERIES_SECTIONS,
  getCuratedBaseNames,
  getFamiliarName,
  type AnimeSeries,
} from "@/lib/digimon/animeEvolutionLines";
import type { Digimon, DigimonCardData, DigimonPageResult } from "@/types/digimon";

export { DigimonNotFoundError, DigimonApiError } from "@/lib/digimon/api";

/**
 * Full detail for one digimon, normalized for the UI.
 * Throws DigimonNotFoundError / DigimonApiError — callers decide how to render that.
 */
export async function getDigimon(name: string): Promise<Digimon> {
  const raw = await fetchDigimonByName(name);
  return normalizeDigimon(raw);
}

const PROTAGONIST_IDS_TTL_MS = 60 * 60 * 1000; // mirrors Digi-API's own revalidate window
let cachedProtagonistIds: { ids: Set<number>; expiresAt: number } | null = null;

/**
 * IDs of the 15 curated homepage protagonists (Agumon, Gabumon, ... Renamon)
 * — resolved by name, never hardcoded, so this never risks an invented ID.
 * Cached at module scope for an hour: this is called on every catalog page
 * fetch (see getDigimonPage below), and recomputing it each time would mean
 * 15 extra lookups per scroll tick even though the underlying data barely
 * ever changes. The lookups themselves are also normal getDigimon() calls,
 * so they ride Next's own fetch cache/request memoization — calling this
 * alongside getCuratedHomeSections() in the same request costs nothing extra.
 */
async function getCuratedProtagonistIds(): Promise<Set<number>> {
  if (cachedProtagonistIds && cachedProtagonistIds.expiresAt > Date.now()) {
    return cachedProtagonistIds.ids;
  }

  const names = getCuratedBaseNames();
  const results = await Promise.allSettled(names.map((n) => getDigimon(n)));
  const ids = new Set<number>();
  results.forEach((result) => {
    if (result.status === "fulfilled") ids.add(result.value.id);
  });

  cachedProtagonistIds = { ids, expiresAt: Date.now() + PROTAGONIST_IDS_TTL_MS };
  return ids;
}

/**
 * One page of the full Digimon catalog, in Digi-API's own order — this is
 * what powers the home screen's infinite scroll. Digi-API's list endpoint
 * only returns id/name/image, no level/type data, so each item on the page
 * still needs its own detail fetch (same tradeoff PokeDesk makes for
 * Pokémon); a missing/renamed entry is skipped rather than failing the
 * whole page.
 *
 * Curated homepage protagonists (see animeEvolutionLines.ts) are excluded
 * here too, on every page — not just page 0 — so a digimon already shown in
 * "Digimon Adventure"/"02"/"Tamers" never resurfaces later while scrolling
 * "Archivo completo". Digi-API's own pagination is unaware of this filter,
 * so a page can occasionally come back with fewer than `pageSize` items;
 * that's the same accepted tradeoff as the per-item fetch failures below.
 */
export async function getDigimonPage(
  page: number,
  pageSize: number = DIGIMON_PAGE_SIZE,
): Promise<DigimonPageResult> {
  const listPage = await fetchDigimonListPage(page, pageSize);
  // Digi-API omits `content` entirely (rather than returning []) once `page`
  // is past the last real page — confirmed by requesting a page beyond
  // totalPages, which crashed this function until this guard was added.
  const content = listPage.content ?? [];

  const [results, excludedIds] = await Promise.all([
    Promise.allSettled(content.map((item) => getDigimon(item.name))),
    getCuratedProtagonistIds(),
  ]);

  const items: DigimonPageResult["items"] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      if (excludedIds.has(result.value.id)) return;
      items.push(toCardData(result.value));
    } else {
      console.error(
        `[digidesk] no se pudo cargar "${content[i].name}" (página ${page})`,
        result.reason,
      );
    }
  });

  return {
    items,
    page,
    hasMore: listPage.pageable.nextPage !== "",
  };
}

export interface CuratedSeriesSection {
  series: AnimeSeries;
  title: string;
  items: DigimonCardData[];
}

/**
 * The homepage's curated-by-series sections — 15 protagonists total, fetched
 * once in parallel (never one request per curated digimon per render: this
 * single function is the one place that happens). Card names are swapped to
 * the familiar dub name (getFamiliarName); a protagonist that fails to load
 * is simply omitted from its section rather than failing the whole page.
 */
export async function getCuratedHomeSections(): Promise<CuratedSeriesSection[]> {
  const allNames = getCuratedBaseNames();
  const results = await Promise.allSettled(allNames.map((n) => getDigimon(n)));

  const byName = new Map<string, Digimon>();
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      byName.set(allNames[i], result.value);
    } else {
      console.error(
        `[digidesk] no se pudo cargar el protagonista curado "${allNames[i]}"`,
        result.reason,
      );
    }
  });

  return CURATED_SERIES_SECTIONS.map((section) => ({
    series: section.series,
    title: section.title,
    items: section.baseNames
      .map((name) => byName.get(name))
      .filter((d): d is Digimon => d !== undefined)
      .map((d) => ({ ...toCardData(d), name: getFamiliarName(d.name) })),
  }));
}

/** Thin re-export so pages can catch a not-found search without knowing the lib layer. */
export function isDigimonNotFound(error: unknown): error is DigimonNotFoundError {
  return error instanceof DigimonNotFoundError;
}
