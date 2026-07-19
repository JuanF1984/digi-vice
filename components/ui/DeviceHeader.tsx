import Link from "next/link";
import { StatusLed } from "./StatusLed";

/** Top chassis bar: power/signal LEDs + the DigiDesk wordmark. Shared across screens. */
export function DeviceHeader() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-4 pb-3 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-md focus-visible:outline-offset-4"
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 place-items-center rounded-md border border-chassis-deep bg-screen"
        >
          <span className="h-2.5 w-2.5 rounded-sm bg-phosphor shadow-[0_0_6px_2px_rgba(87,242,168,0.6)]" />
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          Digi<span className="text-phosphor">Desk</span>
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <StatusLed color="phosphor" pulse label="En línea" />
      </div>
    </header>
  );
}
