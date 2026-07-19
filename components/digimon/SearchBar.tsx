"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Navigates to /digimon/[name] on submit. The destination page owns the
 * "not found" / error states — this component only owns input UX: trimming,
 * validation, duplicate-submit guarding, and a pending indicator while the
 * route transition (and its server fetch) resolves.
 */
export function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastQuery = useRef<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = value.trim().replace(/\s+/g, " ");

    if (!query) {
      setValidationError("Escribí un nombre para escanear.");
      return;
    }
    setValidationError(null);

    if (query.toLowerCase() === lastQuery.current?.toLowerCase() && isPending) {
      return;
    }
    lastQuery.current = query;

    startTransition(() => {
      router.push(`/digimon/${encodeURIComponent(query)}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Buscar Digimon por nombre"
      className="flex flex-col gap-2"
    >
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[9.5rem] flex-1">
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Nombre del Digimon (ej. Agumon)"
            aria-invalid={validationError ? "true" : "false"}
            aria-describedby={validationError ? "search-error" : undefined}
            className="h-12 w-full rounded-lg border border-chassis-deep bg-screen px-4 font-data text-sm text-bone placeholder:text-bone-muted focus-visible:outline-2 focus-visible:outline-phosphor"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="h-12 shrink-0 rounded-lg border border-phosphor/50 bg-phosphor px-5 font-display text-sm font-semibold tracking-wide text-screen transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Escaneando…" : "Escanear"}
        </button>
      </div>
      <p
        id="search-error"
        role="status"
        aria-live="polite"
        className={`min-h-[1.1rem] font-data text-xs ${validationError ? "text-alert" : "text-transparent"}`}
      >
        {validationError ?? "."}
      </p>
    </form>
  );
}
