import { createClient } from "@/lib/supabase/server";
import { computeSourceHash } from "@/lib/supabase/hash";

const MAX_TEXT_LENGTH = 10000;
const MAX_NAME_LENGTH = 200;

interface SaveTranslationBody {
  digimonId?: unknown;
  digimonName?: unknown;
  sourceText?: unknown;
  translatedText?: unknown;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Descriptions and translations are plain prose — any angle bracket is
 * treated as unexpected markup rather than risk storing/echoing HTML. */
function hasUnexpectedHtml(text: string): boolean {
  return /[<>]/.test(text);
}

/**
 * Saves a Chrome-translated description, called only from the client when a
 * session might exist (see lib/supabase/session.ts). This handler is the
 * real security boundary together with RLS:
 *   1. Validate the payload independently of what the client claims.
 *   2. Require a verified session (`getUser()`, not the cookie-only
 *      `getSession()`).
 *   3. Recompute source_hash from source_text server-side — the client
 *      never sends a hash, so there's nothing to spoof there.
 *   4. Never overwrite a 'reviewed' or 'corrected' row.
 *   5. Let Postgres RLS (auth.uid() = the one authorized UUID) have the
 *      final say on the insert/update itself.
 */
export async function POST(request: Request) {
  let body: SaveTranslationBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const digimonId = body.digimonId;
  const digimonName = normalizeText(body.digimonName);
  const sourceText = normalizeText(body.sourceText);
  const translatedText = normalizeText(body.translatedText);

  if (
    typeof digimonId !== "number" ||
    !Number.isInteger(digimonId) ||
    digimonId <= 0
  ) {
    return Response.json({ error: "digimon_id inválido." }, { status: 400 });
  }
  if (!digimonName || digimonName.length > MAX_NAME_LENGTH) {
    return Response.json(
      { error: "Nombre de Digimon inválido." },
      { status: 400 },
    );
  }
  if (!sourceText || sourceText.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: "Texto original inválido." },
      { status: 400 },
    );
  }
  if (!translatedText || translatedText.length > MAX_TEXT_LENGTH) {
    return Response.json({ error: "Traducción inválida." }, { status: 400 });
  }
  if (hasUnexpectedHtml(sourceText) || hasUnexpectedHtml(translatedText)) {
    return Response.json(
      { error: "Contenido no permitido." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const sourceHash = computeSourceHash(sourceText);

  const { data: existing, error: lookupError } = await supabase
    .from("digimon_translations")
    .select("review_status")
    .eq("digimon_id", digimonId)
    .eq("source_hash", sourceHash)
    .eq("target_language", "es")
    .maybeSingle();

  if (lookupError) {
    console.error(
      "[digidesk] error al consultar traducción existente",
      lookupError,
    );
    return Response.json(
      { error: "No se pudo verificar la traducción existente." },
      { status: 500 },
    );
  }

  if (
    existing &&
    (existing.review_status === "reviewed" ||
      existing.review_status === "corrected")
  ) {
    return Response.json({ status: "skipped", reason: "already-reviewed" });
  }

  const { error: upsertError } = await supabase
    .from("digimon_translations")
    .upsert(
      {
        digimon_id: digimonId,
        digimon_name: digimonName,
        source_language: "en",
        target_language: "es",
        source_text: sourceText,
        source_hash: sourceHash,
        translated_text: translatedText,
        translation_source: "chrome-translator",
        review_status: "automatic",
        created_by: user.id,
      },
      { onConflict: "digimon_id,source_hash,target_language" },
    );

  if (upsertError) {
    console.error("[digidesk] error al guardar traducción", upsertError);
    const status = upsertError.code === "42501" ? 403 : 500;
    return Response.json(
      { error: "No se pudo guardar la traducción." },
      { status },
    );
  }

  return Response.json({ status: "saved" });
}
