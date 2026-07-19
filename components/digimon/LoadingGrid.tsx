export function LoadingGrid() {
  return (
    <div
      role="status"
      aria-label="Cargando Digimon"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-[11rem] animate-pulse flex-col items-center gap-3 rounded-xl border border-screen-line bg-screen-raised p-3"
        >
          <div className="h-20 w-20 rounded-full bg-screen-line sm:h-24 sm:w-24" />
          <div className="h-3 w-3/4 rounded bg-screen-line" />
          <div className="h-4 w-10 rounded-full bg-screen-line" />
        </div>
      ))}
    </div>
  );
}
