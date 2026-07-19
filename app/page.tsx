import { DeviceHeader } from "@/components/ui/DeviceHeader";
import { ScreenPanel } from "@/components/ui/ScreenPanel";
import { SearchBar } from "@/components/digimon/SearchBar";
import { DigimonCatalog } from "@/components/digimon/DigimonCatalog";
import { EmptyState } from "@/components/digimon/EmptyState";
import { getDigimonPage } from "@/services/digimon";
import { DIGIMON_PAGE_SIZE } from "@/lib/digimon/constants";

export default async function HomePage() {
  let firstPage;
  try {
    firstPage = await getDigimonPage(0, DIGIMON_PAGE_SIZE);
  } catch (error) {
    console.error("[digidesk] fallo al cargar la primera página", error);
    firstPage = { items: [], page: 0, hasMore: false };
  }

  return (
    <div className="circuit-texture min-h-screen bg-chassis">
      <DeviceHeader />

      <main className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-6">
        <p className="mb-5 max-w-md font-body text-sm leading-relaxed text-ink-muted">
          Escaneá la red Digimon desde tu Digivice de bolsillo. Buscá un
          nombre o desplazate para recorrer el catálogo completo.
        </p>

        <ScreenPanel className="p-4 sm:p-6">
          <div className="space-y-6">
            <SearchBar />

            <div className="space-y-3">
              <h1 className="font-data text-[11px] uppercase tracking-[0.2em] text-bone-muted">
                Catálogo Digimon
              </h1>
              {firstPage.items.length > 0 ? (
                <DigimonCatalog
                  initialItems={firstPage.items}
                  initialHasMore={firstPage.hasMore}
                />
              ) : (
                <EmptyState
                  title="Sin señal de la red Digimon"
                  message="No pudimos cargar el catálogo inicial. Probá recargar la página en unos segundos."
                />
              )}
            </div>
          </div>
        </ScreenPanel>
      </main>
    </div>
  );
}
