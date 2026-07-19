"use client";

import { useEffect } from "react";
import { DeviceHeader } from "@/components/ui/DeviceHeader";
import { ScreenPanel } from "@/components/ui/ScreenPanel";
import { ErrorPanel } from "@/components/digimon/ErrorPanel";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="circuit-texture min-h-screen bg-chassis">
      <DeviceHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-6">
        <ScreenPanel className="p-4 sm:p-6">
          <ErrorPanel
            title="Falla inesperada del sistema"
            message="DigiDesk encontró un error interno. Podés intentar de nuevo."
          />
          <div className="flex justify-center pb-4">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-phosphor/40 px-4 py-2 font-data text-xs uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor/10"
            >
              Reintentar
            </button>
          </div>
        </ScreenPanel>
      </main>
    </div>
  );
}
