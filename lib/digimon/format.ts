export function formatDexId(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
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
