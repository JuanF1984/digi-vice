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
 */
async function digiApiFetch<T>(
  path: string,
  revalidateSeconds: number,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      next: { revalidate: revalidateSeconds },
    });
  } catch (cause) {
    console.error("[digi-api] network error", path, cause);
    throw new DigimonApiError("No se pudo conectar con Digi-API");
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

export async function fetchDigimonByName(
  name: string,
): Promise<DigimonDetailResponse> {
  const clean = name.trim();
  try {
    return await digiApiFetch<DigimonDetailResponse>(
      `/digimon/${encodeURIComponent(clean)}`,
      3600,
    );
  } catch (error) {
    const alias = resolveNameAlias(clean);
    if (alias && error instanceof DigimonNotFoundError) {
      return digiApiFetch<DigimonDetailResponse>(
        `/digimon/${encodeURIComponent(alias)}`,
        3600,
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
