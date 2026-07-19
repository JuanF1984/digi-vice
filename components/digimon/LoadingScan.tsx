export function LoadingScan() {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center"
    >
      <div className="relative grid h-28 w-28 place-items-center rounded-full border border-phosphor/30">
        <div className="absolute inset-0 rounded-full border-t-2 border-phosphor animate-spin-slow" />
        <div className="absolute inset-3 rounded-full border border-dashed border-phosphor/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-phosphor animate-pulse-dot" />
      </div>
      <p className="font-data text-xs uppercase tracking-[0.2em] text-bone-muted">
        Escaneando datos…
      </p>
    </div>
  );
}
