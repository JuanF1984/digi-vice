import { createClient } from "@/lib/supabase/server";
import { computeSourceHash } from "@/lib/supabase/hash";

export type ReviewStatus = "automatic" | "reviewed" | "corrected";

export interface SavedTranslation {
  text: string;
  reviewStatus: ReviewStatus;
}

const REVIEW_STATUS_PRIORITY: Record<string, number> = {
  corrected: 3,
  reviewed: 2,
  automatic: 1,
};

/**
 * Looks up a previously saved Spanish translation for this exact English
 * description (public read — RLS allows anon select). The table's unique
 * constraint on (digimon_id, source_hash, target_language) guarantees at
 * most one matching row in practice; the priority sort below is defensive
 * groundwork for the "corrected > reviewed > automatic" preference order,
 * in case that constraint is ever relaxed to allow re-translations.
 *
 * Never throws — a missing Supabase config or a network hiccup falls back
 * to null so the ficha still renders (Translator API / English take over).
 */
export async function getSavedTranslation(
  digimonId: number,
  sourceText: string,
): Promise<SavedTranslation | null> {
  try {
    const supabase = await createClient();
    const sourceHash = computeSourceHash(sourceText);

    const { data, error } = await supabase
      .from("digimon_translations")
      .select("translated_text, review_status")
      .eq("digimon_id", digimonId)
      .eq("source_hash", sourceHash)
      .eq("target_language", "es");

    if (error) {
      console.error(
        "[digidesk] error al consultar traducción guardada",
        error,
      );
      return null;
    }
    if (!data || data.length === 0) return null;

    const best = [...data].sort(
      (a, b) =>
        (REVIEW_STATUS_PRIORITY[b.review_status] ?? 0) -
        (REVIEW_STATUS_PRIORITY[a.review_status] ?? 0),
    )[0];

    return {
      text: best.translated_text,
      reviewStatus: best.review_status as ReviewStatus,
    };
  } catch (error) {
    console.error(
      "[digidesk] fallo inesperado al leer traducciones guardadas",
      error,
    );
    return null;
  }
}
