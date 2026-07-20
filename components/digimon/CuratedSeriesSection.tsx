import type { DigimonCardData } from "@/types/digimon";
import { DigimonCard } from "./DigimonCard";

interface CuratedSeriesSectionProps {
  title: string;
  items: DigimonCardData[];
}

/**
 * One of the homepage's curated-by-series rows (Adventure / 02 / Tamers).
 * A horizontal touch-scroll row below `sm` keeps card images full-size and
 * the section short regardless of item count; from `sm` up there's enough
 * width to lay them out as a wrapped grid instead, which reads more
 * naturally on a non-touch, mouse-driven screen.
 */
export function CuratedSeriesSection({ title, items }: CuratedSeriesSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-data text-[11px] uppercase tracking-[0.2em] text-bone-muted">
        {title}
      </h2>
      <ul className="flex snap-x gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0 md:grid-cols-5 xl:grid-cols-8">
        {items.map((d, i) => (
          <li key={d.id} className="w-28 shrink-0 snap-start sm:w-auto">
            <DigimonCard digimon={d} priority={i < 4} />
          </li>
        ))}
      </ul>
    </section>
  );
}
