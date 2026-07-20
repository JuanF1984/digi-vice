"use client";

import { useState } from "react";
import type { ResolvedAnimeLine } from "@/services/animeEvolutionLines";
import { AnimeLineRow } from "./AnimeLineRow";

interface AnimeLineTabsProps {
  lines: ResolvedAnimeLine[];
  currentDigiApiName: string;
}

/**
 * Only rendered for digimon shared between two curated lines (Paildramon,
 * both Imperialdramon modes, Vikemon) — compact series buttons, not a full
 * tab widget, per the brief's "no interfaz compleja" guidance. All lines'
 * data already arrived resolved as props, so switching is instant.
 */
export function AnimeLineTabs({ lines, currentDigiApiName }: AnimeLineTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = lines[activeIndex];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {lines.map((line, i) => (
          <button
            key={line.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            aria-pressed={i === activeIndex}
            className={`min-h-9 rounded-full border px-3 font-data text-[11px] uppercase tracking-widest transition-colors ${
              i === activeIndex
                ? "border-phosphor bg-phosphor/10 text-phosphor"
                : "border-screen-line text-bone-muted hover:border-phosphor/30"
            }`}
          >
            {line.protagonistFamiliarName}
          </button>
        ))}
      </div>
      <AnimeLineRow stages={active.stages} currentDigiApiName={currentDigiApiName} />
    </div>
  );
}
