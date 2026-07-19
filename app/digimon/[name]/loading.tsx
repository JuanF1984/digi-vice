import { DeviceHeader } from "@/components/ui/DeviceHeader";
import { ScreenPanel } from "@/components/ui/ScreenPanel";
import { LoadingScan } from "@/components/digimon/LoadingScan";

export default function DigimonLoading() {
  return (
    <div className="circuit-texture min-h-screen bg-chassis">
      <DeviceHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-6">
        <ScreenPanel className="p-4 sm:p-6">
          <LoadingScan />
        </ScreenPanel>
      </main>
    </div>
  );
}
