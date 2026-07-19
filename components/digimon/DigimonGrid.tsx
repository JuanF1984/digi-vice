import type { DigimonCardData } from "@/types/digimon";
import { DigimonCard } from "./DigimonCard";

interface DigimonGridProps {
  digimon: DigimonCardData[];
}

export function DigimonGrid({ digimon }: DigimonGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
      {digimon.map((d, i) => (
        <li key={d.id}>
          <DigimonCard digimon={d} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
