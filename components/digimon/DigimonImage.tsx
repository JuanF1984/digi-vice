"use client";

import { useState } from "react";
import Image from "next/image";

interface DigimonImageProps {
  src: string | null;
  alt: string;
  size: number;
  priority?: boolean;
}

/**
 * Wraps next/image with a per-instance broken-image fallback so one missing
 * sprite never breaks the surrounding card or scan panel.
 */
export function DigimonImage({
  src,
  alt,
  size,
  priority = false,
}: DigimonImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="grid place-items-center rounded-lg border border-dashed border-bone-muted/30 bg-screen-raised text-bone-muted"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${alt} — imagen no disponible`}
      >
        <span className="font-data text-[10px] uppercase tracking-widest">
          Sin señal
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      onError={() => setFailed(true)}
      className="h-full max-h-full w-full max-w-full object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
      style={{ width: size, height: size }}
    />
  );
}
