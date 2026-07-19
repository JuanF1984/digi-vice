"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { DigimonCardData, DigimonPageResult } from "@/types/digimon";
import { DigimonGrid } from "./DigimonGrid";
import { readCatalogSnapshot, saveCatalogSnapshot } from "@/lib/digimon/catalogCache";

interface DigimonCatalogProps {
  initialItems: DigimonCardData[];
  initialHasMore: boolean;
}

type LoadStatus = "idle" | "loading" | "error";

// useLayoutEffect warns when it runs during SSR (it never actually executes
// there, but React still logs it for any component that *can* be
// server-rendered) — this component is, so alias to a no-op-on-server
// equivalent. Standard isomorphic-layout-effect pattern.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Infinite-scroll continuation of the catalog the server already started
 * rendering (page 0 arrives as props, already painted, so there's no
 * mount-time fetch here — only what the user scrolls to costs a request).
 * Loading logic mirrors PokeDesk's PokemonGrid: a synchronous ref guard
 * against re-entrant calls (covers rapid intersection toggling and React
 * Strict Mode's double effect-invoke in dev), plus an AbortController so a
 * response that lands after unmount is simply discarded.
 *
 * Scroll/position restoration additionally mirrors PokeDesk's module-level
 * cache (survives this component unmounting when the user opens a digimon's
 * detail page and comes back), backed by sessionStorage for cases that
 * actually reload the JS. Unlike PokeDesk — which restores by polling for a
 * specific card's DOM node and overlaying a loader — DigiDesk restores the
 * *entire* previously-loaded list synchronously before the browser paints
 * (see the layout effect below), so there's nothing to poll for and no
 * overlay is needed to hide a jump.
 */
export function DigimonCatalog({
  initialItems,
  initialHasMore,
}: DigimonCatalogProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [status, setStatus] = useState<LoadStatus>("idle");

  const loadingRef = useRef(false);
  const nextPageRef = useRef(1); // page 0 was already rendered by the server
  const seenIdsRef = useRef(new Set(initialItems.map((item) => item.id)));
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const restoredRef = useRef(false);

  // Mirrors the latest items/hasMore into a ref after each commit, purely so
  // the unmount-save effect below (which only runs once, with `[]` deps)
  // can read current values without needing to be recreated — and its
  // cleanup re-registered — on every state change.
  const latestRef = useRef({ items, hasMore });
  useEffect(() => {
    latestRef.current = { items, hasMore };
  }, [items, hasMore]);

  // Restore a snapshot from a previous visit *before paint*, so a user
  // coming back from a detail page never sees a flash of the fresh page-0
  // items before the scroll jumps to where they were.
  useIsomorphicLayoutEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const snapshot = readCatalogSnapshot();
    if (!snapshot || snapshot.items.length === 0) return;

    setItems(snapshot.items);
    setHasMore(snapshot.hasMore);
    nextPageRef.current = snapshot.nextPage;
    seenIdsRef.current = new Set(snapshot.items.map((item) => item.id));
    window.scrollTo({ top: snapshot.scrollY, behavior: "instant" });
  }, []);

  // Save a snapshot whenever this instance unmounts — e.g. the user opened a
  // digimon's detail page — so "Volver" can restore both the loaded catalog
  // and the scroll position without refetching or losing progress.
  useEffect(() => {
    return () => {
      saveCatalogSnapshot({
        items: latestRef.current.items,
        nextPage: nextPageRef.current,
        hasMore: latestRef.current.hasMore,
        scrollY: window.scrollY,
      });
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setStatus("loading");

    const controller = new AbortController();
    abortRef.current = controller;
    const page = nextPageRef.current;

    try {
      const res = await fetch(`/api/digimon?page=${page}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`/api/digimon respondió ${res.status}`);
      const data: DigimonPageResult = await res.json();

      const fresh = data.items.filter(
        (item) => !seenIdsRef.current.has(item.id),
      );
      fresh.forEach((item) => seenIdsRef.current.add(item.id));

      setItems((prev) => [...prev, ...fresh]);
      setHasMore(data.hasMore);
      nextPageRef.current = page + 1;
      setStatus("idle");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("[digidesk] fallo al cargar más Digimon", error);
      setStatus("error");
    } finally {
      loadingRef.current = false;
    }
  }, [hasMore]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  const statusMessage =
    status === "loading"
      ? "Recibiendo nuevos datos…"
      : status === "error"
        ? "No se pudo completar el escaneo de la siguiente tanda."
        : !hasMore
          ? "Archivo digital completo."
          : "";

  return (
    <div className="space-y-4">
      <DigimonGrid digimon={items} />

      <p
        role="status"
        aria-live="polite"
        className="min-h-[1.25rem] text-center font-data text-[11px] uppercase tracking-[0.15em] text-bone-muted"
      >
        {statusMessage}
      </p>

      {hasMore ? (
        <div className="flex flex-col items-center gap-3">
          <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
          <button
            type="button"
            onClick={loadMore}
            disabled={status === "loading"}
            className="min-h-11 rounded-lg border border-phosphor/40 px-5 font-data text-xs uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "error"
              ? "Reintentar"
              : status === "loading"
                ? "Cargando…"
                : "Cargar más Digimon"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
