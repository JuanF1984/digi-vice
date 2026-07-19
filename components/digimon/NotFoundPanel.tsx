import Link from "next/link";
import { StatusLed } from "@/components/ui/StatusLed";
import { SearchBar } from "./SearchBar";

interface NotFoundPanelProps {
  query: string;
}

/** Shown when Digi-API has no digimon matching the searched name. */
export function NotFoundPanel({ query }: NotFoundPanelProps) {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-14 text-center">
      <StatusLed color="amber" label="Sin coincidencias" />
      <div className="space-y-1.5">
        <p className="font-display text-lg font-semibold text-bone">
          &ldquo;{query}&rdquo; no identificado
        </p>
        <p className="mx-auto max-w-xs font-body text-sm text-bone-muted">
          Ese nombre no está registrado en la red Digi-API. Revisá la
          ortografía o probá con otro Digimon.
        </p>
      </div>
      <div className="w-full max-w-xs">
        <SearchBar />
      </div>
      <Link
        href="/"
        className="font-data text-xs uppercase tracking-widest text-phosphor hover:underline"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
