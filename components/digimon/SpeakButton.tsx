"use client";

import { useEffect, useRef, useState } from "react";
import { toSpeechLang } from "@/lib/digimon/format";

interface SpeakButtonProps {
  /** Canonical/visible Digimon name — always read in English, first. */
  digimonName: string;
  /** The description text currently on screen (Spanish translation, or the
   * English/original fallback when translation isn't available). */
  text: string;
  /** Language of `text`: "es"/"es_la" for a translation, otherwise the
   * Digi-API source code ("en_us", "en", "jap", ...) for the fallback. */
  language: string;
}

/** Explicit Latin-American-first order — installed voice `lang` tags vary
 * wildly across Windows/Chrome/macOS, so this always checks the tag itself
 * rather than trusting the first "es*" voice reported. */
const SPANISH_VOICE_PRIORITY = [
  "es-AR",
  "es-UY",
  "es-MX",
  "es-US",
  "es-CO",
  "es-CL",
  "es-PE",
  "es-VE",
];

function isSpanishText(language: string): boolean {
  return language === "es" || language === "es_la";
}

function hasSpeechSynthesis() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Latin-American Spanish first, in the priority order above; any other
 * installed es-* voice next; "es-ES" only as a last resort. If nothing
 * Spanish is installed at all this returns undefined and the browser's
 * default voice for the utterance's `lang` is used instead — the app never
 * fabricates a voice the system doesn't actually have.
 */
function pickSpanishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  for (const lang of SPANISH_VOICE_PRIORITY) {
    const match = voices.find((v) => v.lang === lang);
    if (match) return match;
  }
  const otherLatam = voices.find(
    (v) => v.lang.startsWith("es") && v.lang !== "es-ES",
  );
  if (otherLatam) return otherLatam;
  return (
    voices.find((v) => v.lang === "es-ES") ??
    voices.find((v) => v.lang.startsWith("es"))
  );
}

/** en-US first, then any other installed en-* voice. */
function pickEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return (
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en"))
  );
}

/** Exact BCP-47 tag first, then same base-language prefix. Used for the
 * description when it isn't Spanish (English fallback, or Digi-API's rare
 * Japanese-only entries). */
function pickVoiceForTag(
  voices: SpeechSynthesisVoice[],
  tag: string,
): SpeechSynthesisVoice | undefined {
  const primary = tag.split("-")[0];
  return (
    voices.find((v) => v.lang === tag) ??
    voices.find((v) => v.lang.startsWith(primary))
  );
}

const PAUSE_BETWEEN_UTTERANCES_MS = 220;

/**
 * Reads a digimon's name and description aloud with the browser's native
 * speechSynthesis — no paid TTS service. Two separate utterances back to
 * back, since the name is always English and the description may be in a
 * different language:
 *
 *   1. digimonName, English voice.
 *   2. a brief pause, then `text`, in a Spanish voice (Latin-American
 *      preferred) if `language` is Spanish, otherwise a voice matching
 *      `language`.
 *
 * Never autoplays — only starts on click. A session counter invalidates any
 * pending callback (the pause timeout, or a stray utterance `onend`) the
 * instant the user stops or re-triggers playback, so stopping mid-name never
 * lets the description start, and stopping mid-description cancels it
 * immediately.
 */
export function SpeakButton({ digimonName, text, language }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const sessionRef = useRef(0);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasSpeechSynthesis()) return;

    function loadVoices() {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) setVoices(available);
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      if (pauseTimeoutRef.current !== null) {
        clearTimeout(pauseTimeoutRef.current);
      }
      if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
    };
  }, []);

  function stopSpeaking() {
    sessionRef.current += 1;
    if (pauseTimeoutRef.current !== null) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function speakDescription(mySession: number, currentVoices: SpeechSynthesisVoice[]) {
    const spanish = isSpanishText(language);
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = spanish
      ? pickSpanishVoice(currentVoices)
      : pickVoiceForTag(currentVoices, toSpeechLang(language));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? (spanish ? "es-419" : toSpeechLang(language));

    utterance.onend = () => {
      if (sessionRef.current !== mySession) return;
      setSpeaking(false);
    };
    utterance.onerror = () => {
      if (sessionRef.current !== mySession) return;
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  function handleToggle() {
    if (!hasSpeechSynthesis()) {
      setUnsupported(true);
      return;
    }

    if (speaking) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();
    const mySession = ++sessionRef.current;
    const currentVoices =
      voices.length > 0 ? voices : window.speechSynthesis.getVoices();

    const nameUtterance = new SpeechSynthesisUtterance(digimonName);
    const nameVoice = pickEnglishVoice(currentVoices);
    if (nameVoice) nameUtterance.voice = nameVoice;
    nameUtterance.lang = nameVoice?.lang ?? "en-US";

    nameUtterance.onend = () => {
      if (sessionRef.current !== mySession) return;
      pauseTimeoutRef.current = setTimeout(() => {
        pauseTimeoutRef.current = null;
        if (sessionRef.current !== mySession) return;
        speakDescription(mySession, currentVoices);
      }, PAUSE_BETWEEN_UTTERANCES_MS);
    };
    nameUtterance.onerror = () => {
      if (sessionRef.current !== mySession) return;
      setSpeaking(false);
    };

    setSpeaking(true);
    window.speechSynthesis.speak(nameUtterance);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={unsupported}
      aria-pressed={speaking}
      className="inline-flex items-center gap-2 rounded-lg border border-phosphor/40 px-3 py-2 font-data text-[11px] uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor/10 active:scale-95 disabled:cursor-not-allowed disabled:border-bone-muted/30 disabled:text-bone-muted disabled:hover:bg-transparent"
      title={
        unsupported ? "Tu navegador no admite lectura en voz alta" : undefined
      }
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${speaking ? "bg-phosphor animate-pulse-dot" : "bg-bone-muted"}`}
      />
      {unsupported ? "Lectura no disponible" : speaking ? "Detener" : "Escuchar"}
    </button>
  );
}
