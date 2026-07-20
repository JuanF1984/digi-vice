import Link from "next/link";
import type { DigimonCardData } from "@/types/digimon";
import { DigimonImage } from "./DigimonImage";
import { Chip } from "@/components/ui/Chip";

interface DigimonCardProps {
  digimon: DigimonCardData;
  priority?: boolean;
  /**
   * "compact" (default) is the full-archive catalog's original card,
   * unchanged pixel-for-pixel. "spacious" is used only by the homepage's
   * curated series sections, which show far fewer cards per row and can
   * afford a bigger image and more internal air per card.
   */
  variant?: "compact" | "spacious";
}

const VARIANTS = {
  compact: {
    link: "min-h-[11rem] gap-2 p-3",
    imageWrap: "h-20 w-20 sm:h-24 sm:w-24",
    imageSize: 88,
    name: "text-sm",
  },
  spacious: {
    link: "min-h-[13rem] gap-2.5 p-4",
    imageWrap: "h-24 w-24 sm:h-28 sm:w-28",
    imageSize: 104,
    // min-h reserves room for a 2-line name so the level chip lines up at
    // the same height across cards whether a name wraps or not; line-clamp
    // caps it at 2 lines rather than letting a rare long name grow further.
    name: "min-h-[2.5rem] text-base line-clamp-2",
  },
} as const;

export function DigimonCard({
  digimon,
  priority = false,
  variant = "compact",
}: DigimonCardProps) {
  const primaryLevel = digimon.levels[0];
  const v = VARIANTS[variant];

  return (
    <Link
      href={`/digimon/${encodeURIComponent(digimon.slug)}`}
      className={`group flex flex-col items-center rounded-xl border border-screen-line bg-screen-raised text-center transition-all duration-150 hover:border-phosphor/40 hover:bg-screen-raised/80 active:scale-[0.97] ${v.link}`}
    >
      <div className={`flex items-center justify-center ${v.imageWrap}`}>
        <DigimonImage
          src={digimon.image}
          alt={digimon.name}
          size={v.imageSize}
          priority={priority}
        />
      </div>
      <p className={`font-body font-semibold leading-tight text-bone ${v.name}`}>
        {digimon.name}
      </p>
      {primaryLevel ? <Chip tone="amber">{primaryLevel}</Chip> : null}
    </Link>
  );
}
