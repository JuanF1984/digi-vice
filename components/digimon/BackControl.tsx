"use client";

import { useRouter } from "next/navigation";
import { hasCatalogSnapshot } from "@/lib/digimon/catalogCache";

/**
 * "Volver" from a digimon's detail page. When there's real browser history
 * *and* a saved catalog snapshot (meaning this tab actually has a DigiDesk
 * catalog to go back to), it uses router.back() — that's what lets the
 * catalog's own restore effect put the user back at their scroll position.
 * Opened directly from a URL or a new tab, there's no such snapshot, so it
 * falls back to a normal push to "/" instead of a broken/no-op back().
 */
export function BackControl() {
  const router = useRouter();

  function handleBack() {
    const canGoBack =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      hasCatalogSnapshot();

    if (canGoBack) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex min-h-11 items-center gap-1.5 font-data text-xs uppercase tracking-widest text-ink-muted transition-colors hover:text-ink"
    >
      <span aria-hidden="true">←</span> Volver
    </button>
  );
}
