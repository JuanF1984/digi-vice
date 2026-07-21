// Small, stable JSON contract for the CYD firmware ("display=tft"), mirroring
// the pattern already used by the sibling Pokemon project's
// /api/pokemon/[id]?display=tft. Decoupled from Digi-API's raw shape and from
// the web ficha's presentation (no anime-line familiar names, no fields, no
// evolutions) on purpose — see docs/CYD_ENDPOINTS.md for the full contract
// and the reasoning behind every field.
export const runtime = "nodejs";

// Valid on every current Vercel plan tier (Hobby's own ceiling allows up to
// 60s) — not verified against this project's actual plan. This alone is NOT
// the timeout strategy: the Digi-API call below has its own explicit
// AbortSignal, so this is just an outer safety net, not the only guard.
export const maxDuration = 15;

import { getDigimon, DigimonNotFoundError, DigimonApiError } from "@/services/digimon";
import { getSavedTranslation } from "@/services/translations";
import { truncateDescription } from "@/lib/digimon/format";
import type { Digimon } from "@/types/digimon";

const MAX_DESCRIPTION_LENGTH = 250;
const DIGI_API_TIMEOUT_MS = 8000;
const ID_PATTERN = /^[1-9]\d*$/;

type TranslationStatus =
  | "native"
  | "automatic"
  | "reviewed"
  | "corrected"
  | "original"
  | "missing";

interface DigimonTftResponse {
  version: 1;
  id: number;
  name: string;
  levels: string;
  types: string;
  attributes: string;
  description: string;
  descriptionLanguage: string;
  translationStatus: TranslationStatus;
  imageUrl: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!ID_PATTERN.test(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  let digimon: Digimon;
  try {
    digimon = await getDigimon(id, {
      signal: AbortSignal.timeout(DIGI_API_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DigimonNotFoundError) {
      return Response.json({ error: "Digimon not found" }, { status: 404 });
    }
    if (error instanceof DigimonApiError) {
      const status = error.status === 504 ? 504 : 502;
      console.error(`[digidesk] [tft] id=${id} error de Digi-API: ${error.message}`);
      return Response.json({ error: "Upstream error" }, { status });
    }
    console.error(`[digidesk] [tft] id=${id} error inesperado:`, error);
    return Response.json({ error: "Upstream error" }, { status: 502 });
  }

  const levels = digimon.levels.join(", ");
  const types = digimon.types.join(", ");
  const attributes = digimon.attributes.join(", ");

  let description = "";
  let descriptionLanguage = "";
  let translationStatus: TranslationStatus = "missing";

  if (digimon.description) {
    if (digimon.description.isSpanish) {
      // Never happens with Digi-API today, but the web ficha already
      // contemplates it — kept for the same reason: free the day Digi-API
      // adds native Spanish, no code change required.
      description = truncateDescription(digimon.description.text, MAX_DESCRIPTION_LENGTH);
      descriptionLanguage = "es";
      translationStatus = "native";
    } else {
      const saved = await getSavedTranslation(digimon.id, digimon.description.text);
      if (saved) {
        description = truncateDescription(saved.translatedText, MAX_DESCRIPTION_LENGTH);
        descriptionLanguage = "es";
        translationStatus = saved.reviewStatus;
      } else {
        description = truncateDescription(digimon.description.text, MAX_DESCRIPTION_LENGTH);
        descriptionLanguage = digimon.description.language;
        translationStatus = "original";
      }
    }
  }
  // digimon.description === null: description/descriptionLanguage stay "",
  // translationStatus stays "missing" — a 200, not a 404 (an existing
  // Digimon without a reference-book entry is valid, just incomplete).

  console.log(
    `[digidesk] [tft] id=${digimon.id} name=${digimon.name} translationStatus=${translationStatus}`,
  );

  const body: DigimonTftResponse = {
    version: 1,
    id: digimon.id,
    name: digimon.name,
    levels,
    types,
    attributes,
    description,
    descriptionLanguage,
    translationStatus,
    imageUrl: `${origin}/api/digimon/${digimon.id}/image`,
  };

  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
