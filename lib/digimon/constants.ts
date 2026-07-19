/**
 * How many digimon each catalog page fetches. Digi-API doesn't cap pageSize
 * server-side (confirmed up to 500), so staying small is entirely our own
 * responsibility — this mirrors the batch size PokeDesk uses for the same
 * reason: each item needs its own detail fetch for level/type data, so a
 * page of N means N+1 requests server-side.
 */
export const DIGIMON_PAGE_SIZE = 20;

/** Human-readable labels for description language codes returned by Digi-API. */
export const DESCRIPTION_LANGUAGE_LABELS: Record<string, string> = {
  en_us: "Inglés",
  en: "Inglés",
  jap: "Japonés",
  es: "Español",
  es_la: "Español",
};
