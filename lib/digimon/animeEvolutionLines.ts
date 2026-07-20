/**
 * Hand-curated anime evolution lines for the three series a kid who mostly
 * knows the show (not the games/cards) would recognize. Digi-API's own
 * prior/next evolution relations are a flattened graph across every game,
 * card set and device appearance — a champion-level digimon routinely lists
 * dozens of "next" forms, most of them irrelevant to the anime. This file is
 * the opposite: a small, ordered, hand-verified path per protagonist.
 *
 * Every `digiApiName` below was checked against https://digi-api.com/api/v1
 * directly (GET /digimon/{name}, 2026-07) — none of them are guessed. A
 * useful number of them differ from the familiar dub name:
 *
 *   Piyomon → "Biyomon", Mochimon → "Motimon", Choromon → "Pabumon",
 *   Tunomon → "Tsunomon", Pitchmon → "Pichimon", Pukamon → "Bukamon",
 *   Plotmon → "Salamon", Yukimi Botamon → "Snow Botamon",
 *   Armadimon → "Armadillomon", Chicomon → "Chibomon",
 *   Chibimon → "DemiVeemon", XV-mon → "ExVeemon", Growmon → "Growlmon",
 *   Megalo Growmon → "WarGrowlmon", Dukemon → "Gallantmon",
 *   "Rapidmon Perfect" → "Rapidmon", "Saint Galgomon" → "MegaGargomon",
 *   Pokomon → "Viximon", "Holy Angemon" → "MagnaAngemon",
 *   "Atlur Kabuterimon (Red)" → "MegaKabuterimon",
 *   "Herakle Kabuterimon" → "HerculesKabuterimon",
 *   Hououmon → "Phoenixmon", Tailmon → "Gatomon", "V-mon" → "Veemon"
 *   (these last two already had entries in aliases.ts).
 *
 * Known gap: Digi-API has no "Magnadramon" record at all (confirmed via
 * both direct lookup and partial-name search), so Gatomon's curated line
 * stops at Angewomon instead of guessing a Mega stage.
 */

export type AnimeSeries = "adventure" | "adventure02" | "tamers";

export interface AnimeEvolutionStage {
  /** Exact Digi-API name — the only thing used to fetch this stage's data. */
  digiApiName: string;
  /** What a viewer of the dub/sub would recognize; shown in the UI instead. */
  familiarName: string;
}

export interface AnimeEvolutionLine {
  id: string;
  series: AnimeSeries;
  /** Digi-API canonical name of the line's Rookie-stage protagonist. */
  baseDigiApiName: string;
  stages: AnimeEvolutionStage[];
}

export const SERIES_LABELS: Record<AnimeSeries, string> = {
  adventure: "Digimon Adventure",
  adventure02: "Digimon Adventure 02",
  tamers: "Digimon Tamers",
};

function stage(digiApiName: string, familiarName?: string): AnimeEvolutionStage {
  return { digiApiName, familiarName: familiarName ?? digiApiName };
}

export const ANIME_EVOLUTION_LINES: AnimeEvolutionLine[] = [
  // --- Digimon Adventure ---
  {
    id: "adventure-agumon",
    series: "adventure",
    baseDigiApiName: "Agumon",
    stages: [
      stage("Botamon"),
      stage("Koromon"),
      stage("Agumon"),
      stage("Greymon"),
      stage("Metal Greymon", "MetalGreymon"),
      stage("War Greymon", "WarGreymon"),
    ],
  },
  {
    id: "adventure-gabumon",
    series: "adventure",
    baseDigiApiName: "Gabumon",
    stages: [
      stage("Punimon"),
      stage("Tunomon", "Tsunomon"),
      stage("Gabumon"),
      stage("Garurumon"),
      stage("Were Garurumon", "WereGarurumon"),
      stage("Metal Garurumon", "MetalGarurumon"),
    ],
  },
  {
    id: "adventure-piyomon",
    series: "adventure",
    baseDigiApiName: "Piyomon",
    stages: [
      stage("Nyokimon"),
      stage("Pyocomon", "Yokomon"),
      stage("Piyomon", "Biyomon"),
      stage("Birdramon"),
      stage("Garudamon"),
      stage("Hououmon", "Phoenixmon"),
    ],
  },
  {
    id: "adventure-tentomon",
    series: "adventure",
    baseDigiApiName: "Tentomon",
    stages: [
      stage("Choromon", "Pabumon"),
      stage("Mochimon", "Motimon"),
      stage("Tentomon"),
      stage("Kabuterimon"),
      stage("Atlur Kabuterimon (Red)", "MegaKabuterimon"),
      stage("Herakle Kabuterimon", "HerculesKabuterimon"),
    ],
  },
  {
    id: "adventure-palmon",
    series: "adventure",
    baseDigiApiName: "Palmon",
    stages: [
      stage("Yuramon"),
      stage("Tanemon"),
      stage("Palmon"),
      stage("Togemon"),
      stage("Lilimon", "Lillymon"),
      stage("Rosemon"),
    ],
  },
  {
    id: "adventure-gomamon",
    series: "adventure",
    baseDigiApiName: "Gomamon",
    stages: [
      stage("Pitchmon", "Pichimon"),
      stage("Pukamon", "Bukamon"),
      stage("Gomamon"),
      stage("Ikkakumon"),
      stage("Zudomon"),
      stage("Vikemon"),
    ],
  },
  {
    id: "adventure-patamon",
    series: "adventure",
    baseDigiApiName: "Patamon",
    stages: [
      stage("Poyomon"),
      stage("Tokomon"),
      stage("Patamon"),
      stage("Angemon"),
      stage("Holy Angemon", "MagnaAngemon"),
      stage("Seraphimon"),
    ],
  },
  {
    id: "adventure-gatomon",
    series: "adventure",
    baseDigiApiName: "Tailmon",
    stages: [
      stage("Yukimi Botamon", "Snow Botamon"),
      stage("Nyaromon"),
      stage("Plotmon", "Salamon"),
      stage("Tailmon", "Gatomon"),
      stage("Angewomon"),
      // No Mega stage: Digi-API has no "Magnadramon" record — see file header.
    ],
  },

  // --- Digimon Adventure 02 ---
  {
    id: "adventure02-veemon",
    series: "adventure02",
    baseDigiApiName: "V-mon",
    stages: [
      stage("Chicomon", "Chibomon"),
      stage("Chibimon", "DemiVeemon"),
      stage("V-mon", "Veemon"),
      stage("XV-mon", "ExVeemon"),
      stage("Paildramon"),
      stage("Imperialdramon(Dragon Mode)", "Imperialdramon (Dragon Mode)"),
      stage("Imperialdramon(Fighter Mode)", "Imperialdramon (Fighter Mode)"),
    ],
  },
  {
    id: "adventure02-hawkmon",
    series: "adventure02",
    baseDigiApiName: "Hawkmon",
    stages: [
      stage("Pururumon"),
      stage("Poromon"),
      stage("Hawkmon"),
      stage("Aquilamon"),
      stage("Silphymon"),
      stage("Valkyrimon"),
    ],
  },
  {
    id: "adventure02-armadillomon",
    series: "adventure02",
    baseDigiApiName: "Armadimon",
    stages: [
      stage("Tsubumon"),
      stage("Upamon"),
      stage("Armadimon", "Armadillomon"),
      stage("Ankylomon"),
      stage("Shakkoumon"),
      stage("Vikemon"),
    ],
  },
  {
    id: "adventure02-wormmon",
    series: "adventure02",
    baseDigiApiName: "Wormmon",
    stages: [
      stage("Leafmon"),
      stage("Minomon"),
      stage("Wormmon"),
      stage("Stingmon"),
      stage("Paildramon"),
      stage("Imperialdramon(Dragon Mode)", "Imperialdramon (Dragon Mode)"),
      stage("Imperialdramon(Fighter Mode)", "Imperialdramon (Fighter Mode)"),
    ],
  },

  // --- Digimon Tamers ---
  {
    id: "tamers-guilmon",
    series: "tamers",
    baseDigiApiName: "Guilmon",
    stages: [
      stage("Jyarimon"),
      stage("Gigimon"),
      stage("Guilmon"),
      stage("Growmon", "Growlmon"),
      stage("Megalo Growmon", "WarGrowlmon"),
      stage("Dukemon", "Gallantmon"),
    ],
  },
  {
    id: "tamers-terriermon",
    series: "tamers",
    baseDigiApiName: "Terriermon",
    stages: [
      stage("Zerimon"),
      stage("Gummymon"),
      stage("Terriermon"),
      stage("Gargomon"),
      stage("Rapidmon Perfect", "Rapidmon"),
      stage("Saint Galgomon", "MegaGargomon"),
    ],
  },
  {
    id: "tamers-renamon",
    series: "tamers",
    baseDigiApiName: "Renamon",
    stages: [
      stage("Relemon"),
      stage("Pokomon", "Viximon"),
      stage("Renamon"),
      stage("Kyubimon"),
      stage("Taomon"),
      stage("Sakuyamon"),
    ],
  },
];

/** Homepage curated sections, in the order they should appear. */
export const CURATED_SERIES_SECTIONS: {
  series: AnimeSeries;
  title: string;
  baseNames: string[];
}[] = [
  {
    series: "adventure",
    title: SERIES_LABELS.adventure,
    baseNames: [
      "Agumon",
      "Gabumon",
      "Piyomon",
      "Tentomon",
      "Palmon",
      "Gomamon",
      "Patamon",
      "Tailmon",
    ],
  },
  {
    series: "adventure02",
    title: SERIES_LABELS.adventure02,
    baseNames: ["V-mon", "Hawkmon", "Armadimon", "Wormmon"],
  },
  {
    series: "tamers",
    title: SERIES_LABELS.tamers,
    baseNames: ["Guilmon", "Terriermon", "Renamon"],
  },
];

export function getCuratedBaseNames(): string[] {
  return CURATED_SERIES_SECTIONS.flatMap((section) => section.baseNames);
}

/**
 * All curated lines a digimon appears in — usually 0 or 1, but a handful of
 * digimon are shared between two protagonists' lines (Paildramon and both
 * Imperialdramon modes between Veemon/Wormmon, Vikemon between
 * Gomamon/Armadillomon). Order follows ANIME_EVOLUTION_LINES.
 */
export function getAnimeLinesForDigimon(digiApiName: string): AnimeEvolutionLine[] {
  const key = digiApiName.trim().toLowerCase();
  return ANIME_EVOLUTION_LINES.filter((line) =>
    line.stages.some((s) => s.digiApiName.toLowerCase() === key),
  );
}

let familiarNameIndex: Map<string, string> | null = null;
function getFamiliarNameIndex(): Map<string, string> {
  if (!familiarNameIndex) {
    familiarNameIndex = new Map();
    for (const line of ANIME_EVOLUTION_LINES) {
      for (const s of line.stages) {
        familiarNameIndex.set(s.digiApiName.toLowerCase(), s.familiarName);
      }
    }
  }
  return familiarNameIndex;
}

/** Familiar dub name for a Digi-API canonical name, or the input unchanged
 * if it isn't part of any curated line (never guesses a translation). */
export function getFamiliarName(digiApiName: string): string {
  return getFamiliarNameIndex().get(digiApiName.trim().toLowerCase()) ?? digiApiName;
}

let reverseAliasIndex: Map<string, string> | null = null;
function getReverseAliasIndex(): Map<string, string> {
  if (!reverseAliasIndex) {
    reverseAliasIndex = new Map();
    for (const line of ANIME_EVOLUTION_LINES) {
      for (const s of line.stages) {
        const familiarKey = s.familiarName.trim().toLowerCase();
        if (familiarKey !== s.digiApiName.trim().toLowerCase()) {
          reverseAliasIndex.set(familiarKey, s.digiApiName);
        }
      }
    }
  }
  return reverseAliasIndex;
}

/** Search-time counterpart of getFamiliarName: dub name → Digi-API name, for
 * aliases.ts's fallback chain so searching "Biyomon" or "MetalGreymon" works. */
export function resolveFamiliarNameAlias(name: string): string | null {
  return getReverseAliasIndex().get(name.trim().toLowerCase()) ?? null;
}
