/**
 * Minimal ambient declarations for the browser's built-in Translator API.
 * TypeScript's bundled DOM lib doesn't include this yet (it's a very new,
 * Chrome-only API). Shape verified against the current spec/MDN — not
 * guessed — as of this writing:
 *   - Translator.availability({sourceLanguage, targetLanguage}) resolves to
 *     exactly one of "available" | "downloadable" | "downloading" | "unavailable".
 *   - Translator.create(...) requires transient user activation and can
 *     reject with NotAllowedError/NotSupportedError/NetworkError/
 *     InvalidStateError/OperationError DOMExceptions.
 *   - translator.translate(text) resolves to the translated string.
 */
export {};

declare global {
  type TranslatorAvailability =
    | "available"
    | "downloadable"
    | "downloading"
    | "unavailable";

  interface TranslatorDownloadProgressEvent extends Event {
    readonly loaded: number;
  }

  interface TranslatorCreateMonitor extends EventTarget {
    addEventListener(
      type: "downloadprogress",
      listener: (event: TranslatorDownloadProgressEvent) => void,
    ): void;
  }

  interface TranslatorAvailabilityOptions {
    sourceLanguage: string;
    targetLanguage: string;
  }

  interface TranslatorCreateOptions extends TranslatorAvailabilityOptions {
    monitor?: (monitor: TranslatorCreateMonitor) => void;
    signal?: AbortSignal;
  }

  interface Translator {
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
    translate(text: string): Promise<string>;
    translateStreaming(text: string): AsyncIterable<string>;
    destroy(): void;
  }

  interface TranslatorStatic {
    availability(
      options: TranslatorAvailabilityOptions,
    ): Promise<TranslatorAvailability>;
    create(options: TranslatorCreateOptions): Promise<Translator>;
  }

  interface Window {
    Translator?: TranslatorStatic;
  }
}
