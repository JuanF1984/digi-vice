import { DeviceHeader } from "@/components/ui/DeviceHeader";
import { ScreenPanel } from "@/components/ui/ScreenPanel";
import { EmptyState } from "@/components/digimon/EmptyState";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="circuit-texture min-h-screen bg-chassis">
      <DeviceHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-6">
        <ScreenPanel className="p-4 sm:p-6">
          <EmptyState
            title="Ruta no encontrada"
            message="Esta pantalla no existe en DigiDesk."
          />
          <div className="flex justify-center pb-4">
            <Link
              href="/"
              className="font-data text-xs uppercase tracking-widest text-phosphor hover:underline"
            >
              Volver al inicio
            </Link>
          </div>
        </ScreenPanel>
      </main>
    </div>
  );
}
