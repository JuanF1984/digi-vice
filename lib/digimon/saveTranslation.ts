/**
 * Fire-and-forget client helper that POSTs a Chrome-translated description
 * to be saved server-side. Only ever called when a session might exist (see
 * lib/supabase/session.ts) — the Route Handler is the real gate (auth check
 * + RLS), so this never blocks the UI and never surfaces an error to a
 * normal visitor, only to the console.
 *
 * The in-memory dedupe set stops the same digimon+source+translation combo
 * from being POSTed twice within the tab session; it resets on a full
 * reload, but the server-side upsert is idempotent either way.
 */

const savedKeys = new Set<string>();

interface SaveTranslationInput {
  digimonId: number;
  digimonName: string;
  sourceText: string;
  translatedText: string;
}

function buildDedupeKey(input: SaveTranslationInput): string {
  return `${input.digimonId}::${input.sourceText}::${input.translatedText}`;
}

export function saveTranslation(input: SaveTranslationInput): void {
  const key = buildDedupeKey(input);
  if (savedKeys.has(key)) return;
  savedKeys.add(key);

  fetch("/api/translations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      digimonId: input.digimonId,
      digimonName: input.digimonName,
      sourceText: input.sourceText,
      translatedText: input.translatedText,
    }),
  })
    .then(async (res) => {
      // 401 is expected whenever the optimistic session check was wrong
      // (e.g. the session just expired) — not worth logging as an error.
      if (!res.ok && res.status !== 401) {
        const body = await res.json().catch(() => null);
        console.error(
          "[digidesk] no se pudo guardar la traducción",
          res.status,
          body,
        );
      }
    })
    .catch((error) => {
      console.error("[digidesk] error de red al guardar la traducción", error);
      savedKeys.delete(key);
    });
}
