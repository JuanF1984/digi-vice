import {
  fetchDigimonByName,
  fetchDigimonListPage,
  DigimonNotFoundError,
} from "@/lib/digimon/api";
import { normalizeDigimon, toCardData } from "@/lib/digimon/normalize";
import { DIGIMON_PAGE_SIZE } from "@/lib/digimon/constants";
import type { Digimon, DigimonPageResult } from "@/types/digimon";

export { DigimonNotFoundError, DigimonApiError } from "@/lib/digimon/api";

/**
 * Full detail for one digimon, normalized for the UI.
 * Throws DigimonNotFoundError / DigimonApiError — callers decide how to render that.
 */
export async function getDigimon(name: string): Promise<Digimon> {
  const raw = await fetchDigimonByName(name);
  return normalizeDigimon(raw);
}

/**
 * One page of the full Digimon catalog, in Digi-API's own order — this is
 * what powers the home screen's infinite scroll. Digi-API's list endpoint
 * only returns id/name/image, no level/type data, so each item on the page
 * still needs its own detail fetch (same tradeoff PokeDesk makes for
 * Pokémon); a missing/renamed entry is skipped rather than failing the
 * whole page.
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

  const results = await Promise.allSettled(
    content.map((item) => getDigimon(item.name)),
  );

  const items: DigimonPageResult["items"] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
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

/** Thin re-export so pages can catch a not-found search without knowing the lib layer. */
export function isDigimonNotFound(error: unknown): error is DigimonNotFoundError {
  return error instanceof DigimonNotFoundError;
}
