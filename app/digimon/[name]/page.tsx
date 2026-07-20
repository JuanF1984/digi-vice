import type { Metadata } from "next";
import { DeviceHeader } from "@/components/ui/DeviceHeader";
import { ScreenPanel } from "@/components/ui/ScreenPanel";
import { Chip } from "@/components/ui/Chip";
import { BackControl } from "@/components/digimon/BackControl";
import { DigimonImage } from "@/components/digimon/DigimonImage";
import { ScanReticle } from "@/components/digimon/ScanReticle";
import { InfoTile } from "@/components/digimon/InfoTile";
import { DescriptionPanel } from "@/components/digimon/DescriptionPanel";
import { EvolutionRow } from "@/components/digimon/EvolutionRow";
import { NotFoundPanel } from "@/components/digimon/NotFoundPanel";
import { ErrorPanel } from "@/components/digimon/ErrorPanel";
import { getDigimon, isDigimonNotFound } from "@/services/digimon";
import { getSavedTranslation } from "@/services/translations";
import { hasOptimisticSession } from "@/lib/supabase/session";
import { decodeDigimonName, formatDexId } from "@/lib/digimon/format";
import type { Digimon } from "@/types/digimon";

interface DigimonPageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({
  params,
}: DigimonPageProps): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeDigimonName(name);
  try {
    const digimon = await getDigimon(decodedName);
    return { title: `${digimon.name} — DigiDesk` };
  } catch {
    return { title: `${decodedName} — DigiDesk` };
  }
}

export default async function DigimonPage({ params }: DigimonPageProps) {
  const { name } = await params;
  const decodedName = decodeDigimonName(name);

  let digimon: Digimon;
  try {
    digimon = await getDigimon(decodedName);
  } catch (error) {
    return (
      <Shell>
        {isDigimonNotFound(error) ? (
          <NotFoundPanel query={decodedName} />
        ) : (
          <ErrorPanel />
        )}
      </Shell>
    );
  }

  const needsTranslationLookup =
    digimon.description !== null && !digimon.description.isSpanish;

  const [savedTranslation, canSaveTranslations] = await Promise.all([
    needsTranslationLookup
      ? getSavedTranslation(digimon.id, digimon.description!.text)
      : Promise.resolve(null),
    hasOptimisticSession(),
  ]);

  return (
    <Shell showBack idBadge={formatDexId(digimon.id)}>
      <div className="space-y-6">
        <ScanReticle>
          <div className="flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
            <DigimonImage
              src={digimon.image}
              alt={digimon.name}
              size={176}
              priority
            />
          </div>
        </ScanReticle>

        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-bold text-bone">
            {digimon.name}
          </h1>
          {digimon.levels.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {digimon.levels.map((level) => (
                <Chip key={level} tone="amber">
                  {level}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoTile label="Atributo" values={digimon.attributes} tone="signal" />
          <InfoTile label="Tipo" values={digimon.types} tone="phosphor" />
        </div>

        {digimon.fields.length > 0 ? (
          <InfoTile
            label="Campos"
            values={digimon.fields.map((f) => f.name)}
            tone="amber"
          />
        ) : null}

        <DescriptionPanel
          description={digimon.description}
          name={digimon.name}
          digimonId={digimon.id}
          savedTranslation={savedTranslation}
          canSaveTranslations={canSaveTranslations}
        />

        <EvolutionRow
          title="Evoluciones previas"
          items={digimon.priorEvolutions}
        />
        <EvolutionRow
          title="Próximas evoluciones"
          items={digimon.nextEvolutions}
        />
      </div>
    </Shell>
  );
}

function Shell({
  children,
  showBack,
  idBadge,
}: {
  children: React.ReactNode;
  showBack?: boolean;
  idBadge?: string;
}) {
  return (
    <div className="circuit-texture min-h-screen bg-chassis">
      <DeviceHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-6">
        {showBack ? (
          <div className="mb-4 flex items-center justify-between">
            <BackControl />
            {idBadge ? (
              <span className="rounded-full border border-chassis-deep px-2.5 py-1 font-data text-[11px] uppercase tracking-wide text-ink-muted">
                {idBadge}
              </span>
            ) : null}
          </div>
        ) : null}
        <ScreenPanel className="p-4 sm:p-6">{children}</ScreenPanel>
      </main>
    </div>
  );
}
