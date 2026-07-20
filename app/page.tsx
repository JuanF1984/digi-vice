import { DeviceHeader } from "@/components/ui/DeviceHeader";
import { ScreenPanel } from "@/components/ui/ScreenPanel";
import { SearchBar } from "@/components/digimon/SearchBar";
import { CuratedSeriesSection } from "@/components/digimon/CuratedSeriesSection";
import { DigimonCatalog } from "@/components/digimon/DigimonCatalog";
import { EmptyState } from "@/components/digimon/EmptyState";
import {
  getDigimonPage,
  getCuratedHomeSections,
  type CuratedSeriesSection as CuratedSeriesSectionData,
} from "@/services/digimon";
import { DIGIMON_PAGE_SIZE } from "@/lib/digimon/constants";
import type { DigimonPageResult } from "@/types/digimon";

export default async function HomePage() {
  let firstPage: DigimonPageResult;
  let curatedSections: CuratedSeriesSectionData[];
  try {
    // Curated sections and page 0 of the full archive load in parallel —
    // both hit getDigimon() for their own digimon, but Next's fetch cache
    // and per-request memoization mean the 15 curated names never cost more
    // than one real network round-trip each, however many places ask for them.
    [firstPage, curatedSections] = await Promise.all([
      getDigimonPage(0, DIGIMON_PAGE_SIZE),
      getCuratedHomeSections(),
    ]);
  } catch (error) {
    console.error("[digidesk] fallo al cargar la primera página", error);
    firstPage = { items: [], page: 0, hasMore: false };
    curatedSections = [];
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

            {curatedSections.map((section) => (
              <CuratedSeriesSection
                key={section.series}
                title={section.title}
                items={section.items}
              />
            ))}

            <div className="space-y-3">
              <h1 className="font-data text-[11px] uppercase tracking-[0.2em] text-bone-muted">
                Archivo completo
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
