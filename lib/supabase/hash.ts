import { createHash } from "crypto";

/**
 * Stable SHA-256 hex digest of a description's text — the same input always
 * produces the same digimon_translations.source_hash. Computed exclusively
 * on the server (Node's `crypto`), so the read path (services/translations)
 * and the write path (app/api/translations) can never disagree on it; the
 * browser never computes or sends its own hash.
 */
export function computeSourceHash(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
