import type { Digimon } from "@/types/digimon";
import type { SavedTranslation } from "@/services/translations";
import { TranslatedDescription } from "./TranslatedDescription";

interface DescriptionPanelProps {
  description: Digimon["description"];
  /** Canonical/visible Digimon name, read aloud (in English) by SpeakButton. */
  name: string;
  /** Digi-API's numeric id — the key used in digimon_translations. */
  digimonId: number;
  /** Looked up server-side; takes priority over the Translator API. */
  savedTranslation: SavedTranslation | null;
  /** Optimistic-only: whether a fresh Chrome translation may be attempted
   * to be saved. See lib/supabase/session.ts. */
  canSaveTranslations: boolean;
}

/**
 * Shows the digimon's reference-book entry. Digi-API only ever returns
 * English (or, rarely, Japanese) text — the actual language/translation
 * handling lives in TranslatedDescription (client-only, since it depends on
 * the browser's Translator API), kept as small and isolated as possible so
 * this panel and the rest of the ficha stay server-rendered.
 */
export function DescriptionPanel({
  description,
  name,
  digimonId,
  savedTranslation,
  canSaveTranslations,
}: DescriptionPanelProps) {
  return (
    <section className="space-y-3 rounded-xl border border-screen-line bg-screen-raised p-4">
      <h2 className="font-data text-[11px] uppercase tracking-[0.2em] text-bone-muted">
        Registro
      </h2>

      {description ? (
        <TranslatedDescription
          originalText={description.text}
          sourceLanguage={description.language}
          isAlreadySpanish={description.isSpanish}
          digimonName={name}
          digimonId={digimonId}
          savedText={savedTranslation?.translatedText ?? null}
          canSaveTranslations={canSaveTranslations}
        />
      ) : (
        <p className="font-body text-sm text-bone-muted">
          Digi-API todavía no tiene un registro descriptivo para este
          Digimon.
        </p>
      )}
    </section>
  );
}
