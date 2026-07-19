/**
 * Shapes mirror the real Digi-API responses (https://digi-api.com/api/v1).
 * Verified against GET /digimon/Agumon and GET /digimon?pagesize=n.
 * Do not add fields that aren't actually present in those payloads.
 */

export interface DigimonListItem {
  id: number;
  name: string;
  href: string;
  image: string;
}

export interface DigimonListResponse {
  /** Absent (not []) once `page` is past the last real page — confirmed live. */
  content?: DigimonListItem[];
  pageable: {
    currentPage: number;
    elementsOnPage: number;
    totalElements: number;
    totalPages: number;
    /** Absolute URL to the adjacent page, or "" (never null) when there isn't one. */
    previousPage: string;
    nextPage: string;
  };
}

export interface DigimonImage {
  href: string;
  transparent: boolean;
}

export interface DigimonLevel {
  id: number;
  level: string;
}

export interface DigimonType {
  id: number;
  type: string;
}

export interface DigimonAttribute {
  id: number;
  attribute: string;
}

export interface DigimonField {
  id: number;
  field: string;
  image: string;
}

export interface DigimonDescription {
  origin: string;
  language: string;
  description: string;
}

export interface DigimonSkill {
  id: number;
  skill: string;
  translation: string;
  description: string;
}

export interface DigimonEvolutionRef {
  id: number;
  digimon: string;
  condition: string;
  image: string;
  url: string;
}

/** Raw shape of GET /digimon/{name} */
export interface DigimonDetailResponse {
  id: number;
  name: string;
  xAntibody: boolean;
  images: DigimonImage[];
  levels: DigimonLevel[];
  types: DigimonType[];
  attributes: DigimonAttribute[];
  fields: DigimonField[];
  releaseDate: string | null;
  descriptions: DigimonDescription[];
  skills: DigimonSkill[];
  priorEvolutions: DigimonEvolutionRef[];
  nextEvolutions: DigimonEvolutionRef[];
}

/** Normalized shape the UI actually consumes — decoupled from API quirks. */
export interface Digimon {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  levels: string[];
  types: string[];
  attributes: string[];
  fields: { name: string; image: string }[];
  description: {
    text: string;
    /** BCP-47-ish tag the API reported this text in, e.g. "en_us" or "jap". */
    language: string;
    /** True once we have a real Spanish translation — always false for now. */
    isSpanish: boolean;
  } | null;
  priorEvolutions: NormalizedEvolutionRef[];
  nextEvolutions: NormalizedEvolutionRef[];
}

export interface NormalizedEvolutionRef {
  id: number;
  name: string;
  slug: string;
  condition: string;
  image: string | null;
}

export interface DigimonCardData {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  levels: string[];
}

/** Stable contract served by /api/digimon — decoupled from Digi-API's own shape. */
export interface DigimonPageResult {
  items: DigimonCardData[];
  page: number;
  hasMore: boolean;
}
