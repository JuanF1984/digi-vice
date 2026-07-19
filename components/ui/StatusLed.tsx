interface StatusLedProps {
  color?: "phosphor" | "amber" | "signal" | "alert";
  pulse?: boolean;
  label?: string;
}

const COLOR_MAP: Record<NonNullable<StatusLedProps["color"]>, string> = {
  phosphor: "bg-phosphor shadow-[0_0_6px_2px_rgba(87,242,168,0.65)]",
  amber: "bg-amber shadow-[0_0_6px_2px_rgba(255,178,62,0.65)]",
  signal: "bg-signal shadow-[0_0_6px_2px_rgba(79,215,255,0.65)]",
  alert: "bg-alert shadow-[0_0_6px_2px_rgba(255,107,107,0.65)]",
};

export function StatusLed({
  color = "phosphor",
  pulse = false,
  label,
}: StatusLedProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${COLOR_MAP[color]} ${pulse ? "animate-pulse-dot" : ""}`}
      />
      {label ? (
        <span className="font-data text-[10px] uppercase tracking-widest text-ink-muted">
          {label}
        </span>
      ) : null}
    </span>
  );
}
