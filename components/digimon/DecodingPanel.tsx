/**
 * Fills the description panel while a translation is being prepared or run,
 * instead of ever flashing the English original. No spinner, no dots, no
 * "Cargando" text, no multi-line skeleton bars — just the panel itself
 * glowing/sweeping as if the Digivice were decoding the entry. Respects
 * prefers-reduced-motion via the `.decode-panel` rules in globals.css
 * (static glow, no animation).
 */
export function DecodingPanel() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="decode-panel min-h-[4.5rem] rounded-lg bg-screen px-3 py-3"
    >
      <span className="sr-only">Decodificando traducción…</span>
      <p
        aria-hidden="true"
        className="relative font-data text-[10px] uppercase tracking-[0.25em] text-phosphor/70"
      >
        Decodificando datos
      </p>
    </div>
  );
}
