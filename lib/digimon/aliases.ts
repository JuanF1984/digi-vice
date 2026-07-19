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

export function resolveNameAlias(name: string): string | null {
  return DIGIMON_NAME_ALIASES[name.trim().toLowerCase()] ?? null;
}
