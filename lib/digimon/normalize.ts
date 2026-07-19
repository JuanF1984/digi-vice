import type {
  Digimon,
  DigimonCardData,
  DigimonDetailResponse,
  DigimonEvolutionRef,
  NormalizedEvolutionRef,
} from "@/types/digimon";

/**
 * Preference order for picking a single description out of Digi-API's list.
 * "es"/"es_la" don't exist in the API today, but keeping them first means a
 * real Spanish entry gets used automatically the moment Digi-API adds one —
 * no code change required, just the future /api/digimon/[name] translation
 * layer described in the project brief.
 */
const DESCRIPTION_LANGUAGE_PRIORITY = ["es", "es_la", "en_us", "en", "jap"];

function pickDescription(
  descriptions: DigimonDetailResponse["descriptions"],
): Digimon["description"] {
  if (!descriptions || descriptions.length === 0) return null;

  for (const lang of DESCRIPTION_LANGUAGE_PRIORITY) {
    const match = descriptions.find((d) => d.language === lang);
    if (match) {
      return {
        text: match.description.replace(/\s+/g, " ").trim(),
        language: match.language,
        isSpanish: match.language === "es" || match.language === "es_la",
      };
    }
  }

  const first = descriptions[0];
  return {
    text: first.description.replace(/\s+/g, " ").trim(),
    language: first.language,
    isSpanish: false,
  };
}

function normalizeEvolutionRef(
  ref: DigimonEvolutionRef,
): NormalizedEvolutionRef {
  return {
    id: ref.id,
    name: ref.digimon,
    slug: ref.digimon,
    condition: ref.condition,
    image: ref.image ?? null,
  };
}

export function normalizeDigimon(raw: DigimonDetailResponse): Digimon {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.name,
    image: raw.images?.[0]?.href ?? null,
    levels: raw.levels?.map((l) => l.level) ?? [],
    types: raw.types?.map((t) => t.type) ?? [],
    attributes: raw.attributes?.map((a) => a.attribute) ?? [],
    fields: raw.fields?.map((f) => ({ name: f.field, image: f.image })) ?? [],
    description: pickDescription(raw.descriptions),
    priorEvolutions: (raw.priorEvolutions ?? []).map(normalizeEvolutionRef),
    nextEvolutions: (raw.nextEvolutions ?? []).map(normalizeEvolutionRef),
  };
}

export function toCardData(digimon: Digimon): DigimonCardData {
  return {
    id: digimon.id,
    name: digimon.name,
    slug: digimon.slug,
    image: digimon.image,
    levels: digimon.levels,
  };
}
