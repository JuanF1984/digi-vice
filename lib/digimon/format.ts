export function formatDexId(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}

/**
 * Truncates to at most `maxLength` characters without cutting a word in the
 * middle, appending "..." when truncation actually happened. Used by the CYD
 * ("display=tft") endpoint to keep the JSON response small — see
 * docs/CYD_ENDPOINTS.md. Never used for the source hash: that's always
 * computed over the untruncated text so it matches what was saved.
 */
export function truncateDescription(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const ellipsis = "...";
  const budget = maxLength - ellipsis.length;
  if (budget <= 0) return ellipsis.slice(0, maxLength);

  const cut = trimmed.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${safe.trimEnd()}${ellipsis}`;
}

/**
 * Safely decodes a dynamic route segment exactly once.
 *
 * Next.js 16.2.10 resolves the same `params` promise inconsistently between
 * `generateMetadata` and the page component for `app/digimon/[name]` —
 * confirmed by logging both: `generateMetadata` receives an already-decoded
 * value ("Lady Devimon"), the page component receives the raw URL-encoded
 * segment ("Lady%20Devimon"). Calling decodeURIComponent unconditionally
 * here is safe either way: decoding an already-decoded plain name (no `%`
 * sequences) is a no-op, so this never double-decodes. A malformed percent
 * sequence falls back to the raw value instead of throwing.
 */
export function decodeDigimonName(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Maps Digi-API's description language codes to BCP-47 tags for
 * speechSynthesis. Spanish resolves to "es-419" (Latin American Spanish),
 * never "es-ES" — SpeakButton's voice picker also applies its own explicit
 * Latin-American-first priority list on top of this, since installed voice
 * `lang` tags rarely match "es-419" exactly.
 */
export function toSpeechLang(language: string): string {
  switch (language) {
    case "es":
    case "es_la":
      return "es-419";
    case "en_us":
    case "en":
      return "en-US";
    case "jap":
      return "ja-JP";
    default:
      return "en-US";
  }
}
