import { DeviceHeader } from "@/components/ui/DeviceHeader";
import { ScreenPanel } from "@/components/ui/ScreenPanel";
import { LoadingGrid } from "@/components/digimon/LoadingGrid";

export default function HomeLoading() {
  return (
    <div className="circuit-texture min-h-screen bg-chassis">
      <DeviceHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-6">
        <div className="mb-5 h-9 max-w-md" />
        <ScreenPanel className="p-4 sm:p-6">
          <LoadingGrid />
        </ScreenPanel>
      </main>
    </div>
  );
}
