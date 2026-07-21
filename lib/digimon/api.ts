import type { DigimonDetailResponse, DigimonListResponse } from "@/types/digimon";
import { resolveNameAlias } from "./aliases";

const BASE_URL = "https://digi-api.com/api/v1";

/** Thrown when Digi-API has no record for the requested name. */
export class DigimonNotFoundError extends Error {
  constructor(public readonly query: string) {
    super(`Digimon not found: ${query}`);
    this.name = "DigimonNotFoundError";
  }
}

/** Thrown for network failures or unexpected Digi-API responses. */
export class DigimonApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DigimonApiError";
  }
}

/**
 * Digi-API returns 400 (not 404) for an unknown digimon name — both are
 * treated as "not found" here so callers don't need to know that quirk.
 *
 * `signal` is optional and defaults to `undefined` (no timeout), preserving
 * the exact behavior every existing caller already relies on (home page,
 * ficha page, catalog pagination). Only callers that explicitly pass a
 * signal (the CYD-facing routes) opt into a bounded wait — see
 * docs/CYD_ENDPOINTS.md for why a hard timeout matters there specifically.
 */
async function digiApiFetch<T>(
  path: string,
  revalidateSeconds: number,
  signal?: AbortSignal,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      next: { revalidate: revalidateSeconds },
      signal,
    });
  } catch (cause) {
    // AbortSignal.timeout() rejects with a DOMException named "TimeoutError"
    // (spec behavior) — distinguished here so callers that care (the new CYD
    // routes) can answer 504 instead of a generic 502, without every
    // existing caller needing to know this distinction exists.
    const isTimeout = cause instanceof Error && cause.name === "TimeoutError";
    console.error("[digi-api] network error", path, cause);
    throw new DigimonApiError(
      isTimeout
        ? "Digi-API no respondió dentro del tiempo esperado"
        : "No se pudo conectar con Digi-API",
      isTimeout ? 504 : undefined,
    );
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 404) {
      throw new DigimonNotFoundError(path);
    }
    console.error("[digi-api] unexpected status", res.status, path);
    throw new DigimonApiError(`Digi-API respondió ${res.status}`, res.status);
  }

  return (await res.json()) as T;
}

export interface FetchDigimonOptions {
  /** Optional hard deadline for this call, e.g. `AbortSignal.timeout(8000)`.
   * Omitted by every pre-existing caller — behavior for them is unchanged. */
  signal?: AbortSignal;
}

export async function fetchDigimonByName(
  name: string,
  options?: FetchDigimonOptions,
): Promise<DigimonDetailResponse> {
  const clean = name.trim();
  try {
    return await digiApiFetch<DigimonDetailResponse>(
      `/digimon/${encodeURIComponent(clean)}`,
      3600,
      options?.signal,
    );
  } catch (error) {
    const alias = resolveNameAlias(clean);
    if (alias && error instanceof DigimonNotFoundError) {
      return digiApiFetch<DigimonDetailResponse>(
        `/digimon/${encodeURIComponent(alias)}`,
        3600,
        options?.signal,
      );
    }
    throw error;
  }
}

/**
 * Digi-API's list endpoint. `page` is 0-indexed; the query param is exactly
 * `pageSize` (camelCase) — the lowercase `pagesize` is silently ignored and
 * falls back to the API's own default of 5, confirmed by direct testing.
 * Out-of-range pages return HTTP 200 with an empty `content` array rather
 * than a 404, so "no more pages" must be read from `pageable.nextPage`.
 */
export function fetchDigimonListPage(
  page: number,
  pageSize: number,
): Promise<DigimonListResponse> {
  return digiApiFetch<DigimonListResponse>(
    `/digimon?page=${page}&pageSize=${pageSize}`,
    3600,
  );
}
