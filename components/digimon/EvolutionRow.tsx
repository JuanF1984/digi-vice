import Link from "next/link";
import type { NormalizedEvolutionRef } from "@/types/digimon";
import { DigimonImage } from "./DigimonImage";

interface EvolutionRowProps {
  title: string;
  items: NormalizedEvolutionRef[];
}

const MAX_SHOWN = 12;

/**
 * Horizontally-scrollable, finger-swipeable row. Digimon evolution isn't
 * linear like Pokémon — a digimon can have many prior/next forms — so this
 * intentionally stays a flat scroll row rather than a tree, per the first
 * version's scope. The architecture (NormalizedEvolutionRef) already carries
 * everything a future branching tree view would need.
 */
export function EvolutionRow({ title, items }: EvolutionRowProps) {
  if (items.length === 0) return null;
  const shown = items.slice(0, MAX_SHOWN);

  return (
    <section className="space-y-3">
      <h3 className="font-data text-[11px] uppercase tracking-[0.2em] text-bone-muted">
        {title}
        {items.length > MAX_SHOWN ? ` (+${items.length - MAX_SHOWN})` : ""}
      </h3>
      <ul className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
        {shown.map((evo) => (
          <li key={`${evo.id}-${evo.name}`} className="shrink-0 snap-start">
            <Link
              href={`/digimon/${encodeURIComponent(evo.slug)}`}
              className="flex w-24 flex-col items-center gap-1.5 rounded-lg border border-screen-line bg-screen-raised p-2.5 text-center transition-colors hover:border-phosphor/40 active:scale-[0.97]"
            >
              <DigimonImage src={evo.image} alt={evo.name} size={56} />
              <span className="font-body text-xs font-medium leading-tight text-bone">
                {evo.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
