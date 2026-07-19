import type { NextRequest } from "next/server";
import { getDigimonPage } from "@/services/digimon";
import { DIGIMON_PAGE_SIZE } from "@/lib/digimon/constants";

/**
 * Backs the home screen's infinite scroll. The client only ever talks to
 * this same-origin route (never to Digi-API directly) — that sidesteps any
 * CORS question entirely and keeps every Digi-API call centralized in
 * services/digimon.ts, per the project's architecture.
 */
export async function GET(request: NextRequest) {
  const rawPage = request.nextUrl.searchParams.get("page");
  const parsed = Number(rawPage);
  const page = Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;

  try {
    const result = await getDigimonPage(page, DIGIMON_PAGE_SIZE);
    return Response.json(result);
  } catch (error) {
    console.error("[api/digimon] no se pudo cargar la página", page, error);
    return Response.json(
      { error: "No se pudo cargar la página siguiente." },
      { status: 502 },
    );
  }
}
