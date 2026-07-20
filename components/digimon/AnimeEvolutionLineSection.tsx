import { SERIES_LABELS } from "@/lib/digimon/animeEvolutionLines";
import type { ResolvedAnimeLine } from "@/services/animeEvolutionLines";
import { Chip } from "@/components/ui/Chip";
import { AnimeLineRow } from "./AnimeLineRow";
import { AnimeLineTabs } from "./AnimeLineTabs";

interface AnimeEvolutionLineSectionProps {
  lines: ResolvedAnimeLine[];
  currentDigiApiName: string;
}

/**
 * "Línea del anime" — shown first, ahead of Digi-API's own (much noisier)
 * evolution relations, whenever the current digimon belongs to a curated
 * line. Renders nothing for the ~500 other digimon with no curated line, so
 * the page falls straight through to the regular evolution rows.
 */
export function AnimeEvolutionLineSection({
  lines,
  currentDigiApiName,
}: AnimeEvolutionLineSectionProps) {
  const withStages = lines.filter((l) => l.stages.length > 0);
  if (withStages.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-data text-[11px] uppercase tracking-[0.2em] text-bone-muted">
          Línea del anime
        </h2>
        {withStages.length === 1 ? (
          <Chip tone="phosphor">{SERIES_LABELS[withStages[0].series]}</Chip>
        ) : null}
      </div>

      {withStages.length === 1 ? (
        <AnimeLineRow
          stages={withStages[0].stages}
          currentDigiApiName={currentDigiApiName}
        />
      ) : (
        <AnimeLineTabs lines={withStages} currentDigiApiName={currentDigiApiName} />
      )}
    </section>
  );
}
