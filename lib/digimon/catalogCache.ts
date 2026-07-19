import type { DigimonCardData } from "@/types/digimon";

/** Bumped if this shape ever changes, so a snapshot from an older deploy is discarded instead of misread. */
const SNAPSHOT_VERSION = 1;
const STORAGE_KEY = "digidesk:catalog";
/** Older than this, a snapshot is treated as stale and ignored. */
const MAX_AGE_MS = 30 * 60 * 1000;

export interface CatalogSnapshot {
  version: number;
  items: DigimonCardData[];
  nextPage: number;
  hasMore: boolean;
  scrollY: number;
  savedAt: number;
}

/**
 * Module-level cache — survives DigimonCatalog unmounting/remounting within
 * the same tab session, mirroring how PokeDesk's PokemonGrid keeps its list
 * in a module-level `let` rather than component state. sessionStorage below
 * is the durable backup for cases that actually reload the JS (a hard
 * refresh), which module state can't survive.
 */
let memorySnapshot: CatalogSnapshot | null = null;

export function readCatalogSnapshot(): CatalogSnapshot | null {
  if (memorySnapshot) return memorySnapshot;
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogSnapshot;
    if (
      parsed.version !== SNAPSHOT_VERSION ||
      !Array.isArray(parsed.items) ||
      Date.now() - parsed.savedAt > MAX_AGE_MS
    ) {
      return null;
    }
    memorySnapshot = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCatalogSnapshot(
  snapshot: Omit<CatalogSnapshot, "version" | "savedAt">,
): void {
  const full: CatalogSnapshot = {
    ...snapshot,
    version: SNAPSHOT_VERSION,
    savedAt: Date.now(),
  };
  memorySnapshot = full;

  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // Quota exceeded or storage disabled (e.g. private browsing) — the
    // in-memory copy above still covers same-tab back navigation.
  }
}

export function hasCatalogSnapshot(): boolean {
  return readCatalogSnapshot() !== null;
}
