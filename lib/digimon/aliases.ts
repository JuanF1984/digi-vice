import { resolveFamiliarNameAlias } from "./animeEvolutionLines";

/**
 * Digi-API indexes some digimon under their original Japanese name rather
 * than the Western dub name most fans search for (confirmed by querying
 * https://digi-api.com/api/v1/digimon?name=... directly). This is a small,
 * hand-verified fallback map — not a translation service — used only when
 * the exact name lookup misses.
 */
export const DIGIMON_NAME_ALIASES: Record<string, string> = {
  gatomon: "Tailmon",
  veemon: "V-mon",
};

/**
 * Falls back further to the curated anime-evolution-line data (dub name →
 * Digi-API name, e.g. "biyomon" → "Piyomon", "metalgreymon" → "Metal
 * Greymon") before giving up, so searching by a familiar dub name works for
 * every digimon in those lines, not just the two hardcoded above.
 */
export function resolveNameAlias(name: string): string | null {
  const key = name.trim().toLowerCase();
  return DIGIMON_NAME_ALIASES[key] ?? resolveFamiliarNameAlias(key) ?? null;
}
