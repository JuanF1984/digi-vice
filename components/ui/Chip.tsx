interface ChipProps {
  children: React.ReactNode;
  tone?: "phosphor" | "amber" | "signal" | "neutral";
}

const TONE_MAP: Record<NonNullable<ChipProps["tone"]>, string> = {
  phosphor: "border-phosphor/40 text-phosphor bg-phosphor/10",
  amber: "border-amber/40 text-amber bg-amber/10",
  signal: "border-signal/40 text-signal bg-signal/10",
  neutral: "border-bone-muted/30 text-bone-muted bg-bone/5",
};

export function Chip({ children, tone = "neutral" }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-data text-[11px] uppercase tracking-wide leading-none ${TONE_MAP[tone]}`}
    >
      {children}
    </span>
  );
}
