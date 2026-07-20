"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { SpeakButton } from "./SpeakButton";
import { DecodingPanel } from "./DecodingPanel";
import { DESCRIPTION_LANGUAGE_LABELS } from "@/lib/digimon/constants";
import {
  getCachedTranslation,
  setCachedTranslation,
} from "@/lib/digimon/translationCache";
import { saveTranslation } from "@/lib/digimon/saveTranslation";

interface TranslatedDescriptionProps {
  originalText: string;
  /** Digi-API's own language code for originalText, e.g. "en_us", "jap". */
  sourceLanguage: string;
  isAlreadySpanish: boolean;
  /** Canonical/visible Digimon name, always read aloud in English. */
  digimonName: string;
  /** Digi-API's numeric id — the key used in digimon_translations. */
  digimonId: number;
  /** A translation already saved in Supabase for this exact description, if
   * any — takes priority over the browser's Translator API entirely. */
  savedText: string | null;
  /** Optimistic-only signal that a session might exist (see
   * lib/supabase/session.ts) — gates whether a fresh Chrome translation is
   * even attempted to be saved. The real write authorization happens in the
   * Route Handler + RLS. */
  canSaveTranslations: boolean;
}

type TranslationState =
  | { kind: "already-spanish" }
  | { kind: "saved"; text: string }
  | { kind: "checking" }
  | { kind: "preparing" }
  | { kind: "translating" }
  | { kind: "translated"; text: string }
  | { kind: "unavailable" };

const TARGET_LANGUAGE = "es";

/**
 * `useLayoutEffect` on the client, `useEffect` (a no-op there) on the
 * server — avoids React's "useLayoutEffect does nothing on the server"
 * warning while still resolving synchronously before the browser paints.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Only English source text is attempted in this first browser-translation
 * layer — Digi-API's rare Japanese-only entries are left as-is rather than
 * mistranslated from the wrong source language.
 */
function toTranslatorSource(digiApiLanguage: string): string | null {
  return digiApiLanguage === "en_us" || digiApiLanguage === "en" ? "en" : null;
}

/**
 * Translates a digimon's description client-side with the browser's
 * built-in Translator API (Chrome's on-device model — no server, no key).
 * Every branch of `availability()` and every failure mode of `create()`/
 * `translate()` — unsupported browser, no model, download in progress,
 * missing user activation, network failure — degrades to showing the
 * original text. The ficha never breaks or blocks on this.
 *
 * The English original is only ever shown once we've definitively decided
 * Spanish isn't obtainable (`unavailable`). While a translation is being
 * checked/prepared/run, the panel shows a decoding visual instead — never
 * the English text — so there's no visible language swap.
 */
export function TranslatedDescription({
  originalText,
  sourceLanguage,
  isAlreadySpanish,
  digimonName,
  digimonId,
  savedText,
  canSaveTranslations,
}: TranslatedDescriptionProps) {
  const translatorSource = useMemo(
    () => toTranslatorSource(sourceLanguage),
    [sourceLanguage],
  );

  // SSR-safe and deterministic between server and client — cache lookups
  // need sessionStorage, which doesn't exist on the server, so a cache hit
  // is resolved separately below instead of from this initializer (doing
  // it here would make the server's "checking" HTML mismatch a client that
  // hydrates straight into "translated"). A Supabase-saved translation, by
  // contrast, arrived with the server-rendered props themselves, so it's
  // safe to use directly here — no hydration mismatch, no decoding flash,
  // and (per the read-priority order) it always wins over the Translator
  // API.
  const [state, setState] = useState<TranslationState>(() => {
    if (isAlreadySpanish) return { kind: "already-spanish" };
    if (savedText) return { kind: "saved", text: savedText };
    if (!translatorSource) return { kind: "unavailable" };
    return { kind: "checking" };
  });

  // Runs before the browser paints, so a cache hit is applied before
  // anything is ever shown on screen — no decoding-panel flash, and no
  // hydration mismatch (the server-rendered markup briefly matches, then
  // this swaps it out pre-paint, same as any other client-only state sync).
  useIsomorphicLayoutEffect(() => {
    if (isAlreadySpanish || savedText || !translatorSource) return;
    const cached = getCachedTranslation(
      originalText,
      translatorSource,
      TARGET_LANGUAGE,
    );
    if (cached) setState({ kind: "translated", text: cached });
  }, [originalText, translatorSource, isAlreadySpanish, savedText]);

  useEffect(() => {
    // Nothing to do — the initializer above already picked the right
    // terminal state for these: already Spanish, a Supabase-saved
    // translation, no translator source, or a synchronous cache hit.
    if (
      isAlreadySpanish ||
      savedText ||
      !translatorSource ||
      state.kind === "translated" ||
      state.kind === "saved"
    ) {
      return;
    }

    let cancelled = false;

    async function run() {
      if (typeof window === "undefined" || !window.Translator) {
        if (!cancelled) setState({ kind: "unavailable" });
        return;
      }

      try {
        const availability = await window.Translator.availability({
          sourceLanguage: translatorSource!,
          targetLanguage: TARGET_LANGUAGE,
        });

        if (availability === "unavailable") {
          if (!cancelled) setState({ kind: "unavailable" });
          return;
        }
        if (!cancelled && availability !== "available") {
          setState({ kind: "preparing" });
        }

        const translator = await window.Translator.create({
          sourceLanguage: translatorSource!,
          targetLanguage: TARGET_LANGUAGE,
        });
        if (cancelled) return;

        setState({ kind: "translating" });
        const translated = await translator.translate(originalText);
        if (cancelled) return;

        setCachedTranslation(
          originalText,
          translatorSource!,
          TARGET_LANGUAGE,
          translated,
        );
        setState({ kind: "translated", text: translated });

        // Fire-and-forget: only attempted when a session might exist, never
        // awaited or allowed to affect what's on screen. No saved
        // translation existed yet (that branch never reaches this effect),
        // so this can't overwrite anything.
        if (canSaveTranslations) {
          saveTranslation({
            digimonId,
            digimonName,
            sourceText: originalText,
            translatedText: translated,
          });
        }
      } catch (error) {
        // Covers every failure mode: unsupported browser, no model for this
        // pair, missing user activation, blocked/failed download, or a
        // translate() error — all fall back to the English original.
        console.error("[digidesk] traducción no disponible", error);
        if (!cancelled) setState({ kind: "unavailable" });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalText, translatorSource, isAlreadySpanish, savedText]);

  const isProcessing =
    state.kind === "checking" ||
    state.kind === "preparing" ||
    state.kind === "translating";
  const isSpanishNow =
    state.kind === "translated" ||
    state.kind === "already-spanish" ||
    state.kind === "saved";
  const displayedText =
    state.kind === "translated" || state.kind === "saved"
      ? state.text
      : originalText;
  const originalLabel = (
    DESCRIPTION_LANGUAGE_LABELS[sourceLanguage] ?? sourceLanguage
  ).toLowerCase();

  const caption =
    state.kind === "translated"
      ? "Traducción del navegador"
      : state.kind === "saved"
        ? "Traducción guardada"
        : state.kind === "already-spanish"
          ? ""
          : `Descripción original en ${originalLabel}`;

  if (isProcessing) {
    return <DecodingPanel />;
  }

  return (
    <div className="space-y-2">
      <p className="font-body text-sm leading-relaxed text-bone">
        {displayedText}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-h-[1rem] font-data text-[10px] uppercase tracking-widest text-bone-muted">
          {caption}
        </p>
        <Chip tone={isSpanishNow ? "phosphor" : "signal"}>
          {isSpanishNow
            ? "Español"
            : (DESCRIPTION_LANGUAGE_LABELS[sourceLanguage] ?? sourceLanguage)}
        </Chip>
      </div>
      <SpeakButton
        digimonName={digimonName}
        text={displayedText}
        language={isSpanishNow ? "es" : sourceLanguage}
      />
    </div>
  );
}
