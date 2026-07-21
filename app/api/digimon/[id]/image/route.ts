// Adapts Digi-API's raw sprite (PNG, ~320x320px, ~100KB+, no size guarantee —
// confirmed live against GET /images/digimon/w/Agumon.png) into a small
// fixed-size JPEG the CYD firmware can decode directly with TJpg_Decoder.
//
// Mirrors pokemon/app/api/pokemon/[id]/image/route.js's sharp pipeline
// (same resize/flatten/jpeg approach), but this route adds guards that one
// doesn't have: upstream Content-Type validation, a hard download size cap,
// an explicit fetch timeout, and a check that sharp's output isn't empty.
// See docs/CYD_ENDPOINTS.md for the full reasoning.
export const runtime = "nodejs";

// Same caveat as the TFT route: this is an outer safety net, not the timeout
// strategy itself. Both external calls below (Digi-API detail + image
// download) carry their own explicit AbortSignal.
export const maxDuration = 25;

import sharp from "sharp";
import { getDigimon, DigimonNotFoundError, DigimonApiError } from "@/services/digimon";
import type { Digimon } from "@/types/digimon";

const SIZE = 160;
const JPEG_QUALITY = 82;
const DIGI_API_TIMEOUT_MS = 8000;
const IMAGE_FETCH_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB — generous over the ~105KB observed live
const ID_PATTERN = /^[1-9]\d*$/;

/**
 * Reads a response body with a hard byte cap enforced while streaming, not
 * after the fact — a `Content-Length` header can't be trusted (missing, or
 * lying), so this aborts the read itself the moment the cap is exceeded
 * instead of buffering an unbounded body first and checking afterwards.
 */
async function readBoundedBody(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error(`Response exceeded ${maxBytes} bytes`);
    }
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Response exceeded ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!ID_PATTERN.test(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

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
      console.error(`[digidesk] [image] id=${id} error de Digi-API: ${error.message}`);
      return Response.json({ error: "Upstream error" }, { status });
    }
    console.error(`[digidesk] [image] id=${id} error inesperado:`, error);
    return Response.json({ error: "Upstream error" }, { status: 502 });
  }

  if (!digimon.image) {
    return Response.json({ error: "No image available" }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(digimon.image, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    console.error(`[digidesk] [image] id=${id} fallo al descargar la imagen:`, error);
    return Response.json({ error: "Upstream error" }, { status: isTimeout ? 504 : 502 });
  }

  if (!upstream.ok) {
    console.error(`[digidesk] [image] id=${id} status upstream ${upstream.status}`);
    return Response.json({ error: "Upstream error" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    console.error(`[digidesk] [image] id=${id} content-type inesperado: "${contentType}"`);
    return Response.json({ error: "Upstream error" }, { status: 502 });
  }

  const declaredLength = Number(upstream.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_IMAGE_BYTES) {
    console.error(`[digidesk] [image] id=${id} content-length declarado excede el limite: ${declaredLength}`);
    return Response.json({ error: "Image too large" }, { status: 502 });
  }

  let sourceBuffer: Buffer;
  try {
    sourceBuffer = await readBoundedBody(upstream, MAX_IMAGE_BYTES);
  } catch (error) {
    console.error(`[digidesk] [image] id=${id} descarga invalida o demasiado grande:`, error);
    return Response.json({ error: "Image too large or invalid" }, { status: 502 });
  }

  let jpeg: Buffer;
  try {
    jpeg = await sharp(sourceBuffer)
      .resize(SIZE, SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } catch (error) {
    console.error(`[digidesk] [image] id=${id} fallo al procesar con sharp:`, error);
    return Response.json({ error: "Image processing failed" }, { status: 500 });
  }

  if (!jpeg || jpeg.length === 0) {
    console.error(`[digidesk] [image] id=${id} resultado vacio de sharp`);
    return Response.json({ error: "Image processing failed" }, { status: 500 });
  }

  console.log(`[digidesk] [image] id=${id} bytes=${jpeg.length}`);

  return new Response(jpeg, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": jpeg.length.toString(),
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
