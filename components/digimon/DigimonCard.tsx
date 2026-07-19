import Link from "next/link";
import type { DigimonCardData } from "@/types/digimon";
import { DigimonImage } from "./DigimonImage";
import { Chip } from "@/components/ui/Chip";

interface DigimonCardProps {
  digimon: DigimonCardData;
  priority?: boolean;
}

export function DigimonCard({ digimon, priority = false }: DigimonCardProps) {
  const primaryLevel = digimon.levels[0];

  return (
    <Link
      href={`/digimon/${encodeURIComponent(digimon.slug)}`}
      className="group flex min-h-[11rem] flex-col items-center gap-2 rounded-xl border border-screen-line bg-screen-raised p-3 text-center transition-all duration-150 hover:border-phosphor/40 hover:bg-screen-raised/80 active:scale-[0.97]"
    >
      <div className="flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
        <DigimonImage
          src={digimon.image}
          alt={digimon.name}
          size={88}
          priority={priority}
        />
      </div>
      <p className="font-body text-sm font-semibold leading-tight text-bone">
        {digimon.name}
      </p>
      {primaryLevel ? <Chip tone="amber">{primaryLevel}</Chip> : null}
    </Link>
  );
}
