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

interface TranslatedDescriptionProps {
  originalText: string;
  /** Digi-API's own language code for originalText, e.g. "en_us", "jap". */
  sourceLanguage: string;
  isAlreadySpanish: boolean;
  /** Canonical/visible Digimon name, always read aloud in English. */
  digimonName: string;
}

type TranslationState =
  | { kind: "already-spanish" }
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
}: TranslatedDescriptionProps) {
  const translatorSource = useMemo(
    () => toTranslatorSource(sourceLanguage),
    [sourceLanguage],
  );

  // SSR-safe and deterministic between server and client — cache lookups
  // need sessionStorage, which doesn't exist on the server, so a cache hit
  // is resolved separately below instead of from this initializer (doing
  // it here would make the server's "checking" HTML mismatch a client that
  // hydrates straight into "translated").
  const [state, setState] = useState<TranslationState>(() => {
    if (isAlreadySpanish) return { kind: "already-spanish" };
    if (!translatorSource) return { kind: "unavailable" };
    return { kind: "checking" };
  });

  // Runs before the browser paints, so a cache hit is applied before
  // anything is ever shown on screen — no decoding-panel flash, and no
  // hydration mismatch (the server-rendered markup briefly matches, then
  // this swaps it out pre-paint, same as any other client-only state sync).
  useIsomorphicLayoutEffect(() => {
    if (isAlreadySpanish || !translatorSource) return;
    const cached = getCachedTranslation(
      originalText,
      translatorSource,
      TARGET_LANGUAGE,
    );
    if (cached) setState({ kind: "translated", text: cached });
  }, [originalText, translatorSource, isAlreadySpanish]);

  useEffect(() => {
    // Nothing to do — the initializer above already picked the right
    // terminal state for these: already Spanish, no translator source, or a
    // synchronous cache hit.
    if (
      isAlreadySpanish ||
      !translatorSource ||
      state.kind === "translated"
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
  }, [originalText, translatorSource, isAlreadySpanish]);

  const isProcessing =
    state.kind === "checking" ||
    state.kind === "preparing" ||
    state.kind === "translating";
  const isSpanishNow =
    state.kind === "translated" || state.kind === "already-spanish";
  const displayedText = state.kind === "translated" ? state.text : originalText;
  const originalLabel = (
    DESCRIPTION_LANGUAGE_LABELS[sourceLanguage] ?? sourceLanguage
  ).toLowerCase();

  const caption =
    state.kind === "translated"
      ? "Traducción del navegador"
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
