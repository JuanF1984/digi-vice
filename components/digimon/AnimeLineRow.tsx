import Link from "next/link";
import { DigimonImage } from "./DigimonImage";
import type { ResolvedAnimeStage } from "@/services/animeEvolutionLines";

interface AnimeLineRowProps {
  stages: ResolvedAnimeStage[];
  currentDigiApiName: string;
}

/**
 * Horizontally-scrollable, finger-swipeable row of a curated line's stages,
 * in order, with the digimon currently being viewed highlighted. Reuses the
 * same interaction pattern as EvolutionRow (proven on mobile already) rather
 * than inventing a tree/branching view — this is deliberately flat.
 */
export function AnimeLineRow({ stages, currentDigiApiName }: AnimeLineRowProps) {
  if (stages.length === 0) return null;
  const currentKey = currentDigiApiName.trim().toLowerCase();

  return (
    <ul className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
      {stages.map((s) => {
        const isCurrent = s.digiApiName.toLowerCase() === currentKey;
        return (
          <li key={`${s.id}-${s.digiApiName}`} className="shrink-0 snap-start">
            <Link
              href={`/digimon/${encodeURIComponent(s.slug)}`}
              aria-current={isCurrent ? "page" : undefined}
              className={`flex w-24 flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-colors active:scale-[0.97] ${
                isCurrent
                  ? "border-phosphor bg-phosphor/10 shadow-[0_0_0_1px_rgba(87,242,168,0.3)]"
                  : "border-screen-line bg-screen-raised hover:border-phosphor/40"
              }`}
            >
              <DigimonImage src={s.image} alt={s.familiarName} size={56} />
              <span
                className={`font-body text-xs font-medium leading-tight ${
                  isCurrent ? "text-phosphor" : "text-bone"
                }`}
              >
                {s.familiarName}
              </span>
              {isCurrent ? (
                <span className="font-data text-[9px] uppercase tracking-widest text-phosphor">
                  Actual
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
