interface ScanReticleProps {
  children: React.ReactNode;
}

/**
 * DigiDesk's signature moment: a targeting reticle locks onto the artwork on
 * mount, as if the device just identified the Digimon. Pure CSS, one shot —
 * the global prefers-reduced-motion rule collapses it to its end state.
 */
export function ScanReticle({ children }: ScanReticleProps) {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="animate-reticle-in relative">
        {/* Corner brackets */}
        <span className="absolute -left-3 -top-3 h-5 w-5 border-l-2 border-t-2 border-phosphor" />
        <span className="absolute -right-3 -top-3 h-5 w-5 border-r-2 border-t-2 border-phosphor" />
        <span className="absolute -bottom-3 -left-3 h-5 w-5 border-b-2 border-l-2 border-phosphor" />
        <span className="absolute -bottom-3 -right-3 h-5 w-5 border-b-2 border-r-2 border-phosphor" />

        {/* Sweep line, contained so it never escapes the artwork bounds */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-reticle-sweep absolute inset-x-0 h-1/2 bg-gradient-to-b from-phosphor/0 via-phosphor/25 to-phosphor/0" />
        </div>

        {children}
      </div>
      <p
        className="font-data text-[10px] uppercase tracking-[0.25em] text-phosphor animate-fade-up"
        style={{ animationDelay: "0.4s" }}
      >
        Identificado
      </p>
    </div>
  );
}
