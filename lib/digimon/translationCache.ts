/**
 * Session-only cache for browser-translated text, keyed on the original
 * text plus both language tags so a change in either never serves a stale
 * mismatched result. Two layers, same pattern as catalogCache.ts: a
 * module-level Map (survives client-side navigation, no serialization) and
 * a sessionStorage backup (survives a hard reload within the tab). Neither
 * persists across browser sessions, and no other page/tab can read it.
 */

interface TranslationCacheEntry {
  translatedText: string;
  savedAt: number;
}

const STORAGE_PREFIX = "digidesk:translate:";

const memoryCache = new Map<string, TranslationCacheEntry>();

function buildKey(text: string, sourceLanguage: string, targetLanguage: string): string {
  return `${sourceLanguage}>${targetLanguage}::${text}`;
}

export function getCachedTranslation(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): string | null {
  const key = buildKey(text, sourceLanguage, targetLanguage);

  const hit = memoryCache.get(key);
  if (hit) return hit.translatedText;

  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TranslationCacheEntry;
    memoryCache.set(key, parsed);
    return parsed.translatedText;
  } catch {
    return null;
  }
}

export function setCachedTranslation(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  translatedText: string,
): void {
  const key = buildKey(text, sourceLanguage, targetLanguage);
  const entry: TranslationCacheEntry = { translatedText, savedAt: Date.now() };
  memoryCache.set(key, entry);

  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Quota exceeded or storage disabled (e.g. private browsing) — the
    // in-memory copy above still covers same-tab navigation.
  }
}
