import Link from "next/link";
import { StatusLed } from "@/components/ui/StatusLed";

interface ErrorPanelProps {
  title?: string;
  message?: string;
}

/** Generic, user-facing failure state — technical detail stays in the server/console logs. */
export function ErrorPanel({
  title = "Sin conexión con el servidor de datos",
  message = "No pudimos comunicarnos con la red Digi-API. Revisá tu conexión e intentá de nuevo en unos segundos.",
}: ErrorPanelProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <StatusLed color="alert" pulse label="Error de señal" />
      <div className="space-y-1.5">
        <p className="font-display text-base font-semibold text-bone">
          {title}
        </p>
        <p className="mx-auto max-w-xs font-body text-sm text-bone-muted">
          {message}
        </p>
      </div>
      <Link
        href="/"
        className="mt-1 rounded-lg border border-phosphor/40 px-4 py-2 font-data text-xs uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor/10"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
