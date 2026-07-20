import type { DigimonCardData } from "@/types/digimon";
import { DigimonCard } from "./DigimonCard";

interface CuratedSeriesSectionProps {
  title: string;
  items: DigimonCardData[];
}

/**
 * One of the homepage's curated-by-series rows (Adventure / 02 / Tamers).
 * A real grid at every breakpoint — never a horizontal scroll, so no card
 * is ever partially cut off — capped at 4 columns so a section with only a
 * handful of protagonists (Tamers has 3) still gets roomy, individually
 * legible cards instead of everything squeezed into one dense row.
 * Adventure's 8 protagonists simply wrap onto a second row rather than
 * forcing an 8-column layout. The page's own `max-w-3xl` container stops
 * growing past the `md` breakpoint, so there's no need for a wider tier —
 * more viewport width past that point doesn't give this grid more room.
 */
export function CuratedSeriesSection({ title, items }: CuratedSeriesSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-data text-[11px] uppercase tracking-[0.2em] text-bone-muted">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {items.map((d, i) => (
          <li key={d.id}>
            <DigimonCard digimon={d} priority={i < 4} variant="spacious" />
          </li>
        ))}
      </ul>
    </section>
  );
}
