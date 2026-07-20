import { getDigimon } from "./digimon";
import {
  getFamiliarName,
  type AnimeEvolutionLine,
  type AnimeSeries,
} from "@/lib/digimon/animeEvolutionLines";

export interface ResolvedAnimeStage {
  digiApiName: string;
  familiarName: string;
  id: number;
  slug: string;
  image: string | null;
}

export interface ResolvedAnimeLine {
  id: string;
  series: AnimeSeries;
  /** Familiar name of the line's own protagonist (e.g. "Veemon", "Wormmon")
   * — used to tell two shared lines apart when they're the same series
   * (Paildramon/Imperialdramon belong to two Adventure 02 lines alike). */
  protagonistFamiliarName: string;
  stages: ResolvedAnimeStage[];
}

/**
 * Resolves every stage across all the given lines in one pass, fetching each
 * distinct Digi-API name at most once — matters for shared digimon like
 * Paildramon or both Imperialdramon modes, which would otherwise be fetched
 * twice (once per line they belong to). A stage that fails to fetch (Digi-API
 * hiccup, or a rare renamed entry) is dropped rather than breaking the whole
 * line, mirroring services/digimon.ts's own tolerance for partial failures.
 */
export async function resolveAnimeLines(
  lines: AnimeEvolutionLine[],
): Promise<ResolvedAnimeLine[]> {
  if (lines.length === 0) return [];

  const uniqueNames = Array.from(
    new Set(lines.flatMap((line) => line.stages.map((s) => s.digiApiName))),
  );

  const results = await Promise.allSettled(uniqueNames.map((n) => getDigimon(n)));
  const byName = new Map<string, Awaited<ReturnType<typeof getDigimon>>>();
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      byName.set(uniqueNames[i].toLowerCase(), result.value);
    } else {
      console.error(
        `[digidesk] no se pudo resolver la etapa curada "${uniqueNames[i]}"`,
        result.reason,
      );
    }
  });

  return lines.map((line) => ({
    id: line.id,
    series: line.series,
    protagonistFamiliarName: getFamiliarName(line.baseDigiApiName),
    stages: line.stages
      .map((s) => {
        const digimon = byName.get(s.digiApiName.toLowerCase());
        if (!digimon) return null;
        return {
          digiApiName: s.digiApiName,
          familiarName: s.familiarName,
          id: digimon.id,
          slug: digimon.slug,
          image: digimon.image,
        };
      })
      .filter((s): s is ResolvedAnimeStage => s !== null),
  }));
}
