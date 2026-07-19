interface ScreenPanelProps {
  children: React.ReactNode;
  className?: string;
}

/** The dark LCD panel set into the DigiDesk chassis. Wraps all screen content. */
export function ScreenPanel({ children, className = "" }: ScreenPanelProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-black/40 bg-screen shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_30px_-12px_rgba(0,0,0,0.5)] ${className}`}
    >
      <div
        aria-hidden="true"
        className="scanlines pointer-events-none absolute inset-0 z-10 opacity-60"
      />
      <div className="relative z-0">{children}</div>
    </div>
  );
}
