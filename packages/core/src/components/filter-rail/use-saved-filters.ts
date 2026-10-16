import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Filter } from "@/types/collection";
import { readStorage, writeStorage } from "./storage";
import type { SavedFilter, SavedFilterStorage, SavedFiltersBinding } from "./types";

const STORAGE_PREFIX = "as:filter-rail-saved:v1:";

const isSavedFilter = (value: unknown): value is SavedFilter => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SavedFilter>;
  return (
    typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.filters)
  );
};

/** The default store: localStorage, private to one person in one browser. */
const localStore = (key: string): SavedFilterStorage => ({
  load: () => readStorage(key, (raw) => (Array.isArray(raw) ? raw.filter(isSavedFilter) : []), []),
  save: (items) => writeStorage(key, items),
});

const newId = () => `saved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const toError = (cause: unknown) => (cause instanceof Error ? cause : new Error(String(cause)));

export type UseSavedFiltersOptions = {
  /**
   * Replace the default localStorage store — e.g. a backend table, to follow a
   * user across devices. `load` and `save` may return Promises.
   */
  storage?: SavedFilterStorage;
};

/**
 * Named, personal sets of the rail's filters. Pass the result to
 * `FilterRail.SavedFilters` (the picker) and `FilterRail.SaveFilter` (the
 * pinned Save footer).
 *
 * @example
 * ```tsx
 * const saved = useSavedFilters("products");
 *
 * <FilterRail.Root control={control} sections={sections}>
 *   <FilterRail.SavedFilters {...saved} />
 *   <FilterRail.Sections />
 *   <FilterRail.SaveFilter {...saved} />
 * </FilterRail.Root>
 * ```
 */
export function useSavedFilters(
  storageKey: string,
  options: UseSavedFiltersOptions = {},
): SavedFiltersBinding {
  // A ref, so an inline `storage` object does not reload on every render.
  const storageRef = useRef<SavedFilterStorage>(localStore(STORAGE_PREFIX + storageKey));
  storageRef.current = options.storage ?? localStore(STORAGE_PREFIX + storageKey);

  const [items, setItems] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // The list as of the last write, so two saves in one tick compose.
  const latest = useRef<SavedFilter[]>(items);
  latest.current = items;

  // Loading is I/O against an external store (possibly a server), so it
  // belongs in an effect. Re-runs when the key changes; a stale response from
  // a previous key is ignored.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.resolve()
      .then(() => storageRef.current.load())
      .then((loaded) => {
        if (cancelled) return;
        setItems(loaded);
        latest.current = loaded;
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(toError(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  // Optimistic: the list updates at once; a failed save is reported in `error`.
  const persist = useCallback((next: SavedFilter[]) => {
    latest.current = next;
    setItems(next);
    setError(null);
    Promise.resolve()
      .then(() => storageRef.current.save(next))
      .catch((cause: unknown) => setError(toError(cause)));
  }, []);

  const save = useCallback(
    (name: string, filters: Filter[]) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const current = latest.current;
      // Saving over an existing name replaces it, rather than leaving two
      // entries nobody can tell apart.
      const existing = current.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());
      const entry: SavedFilter = {
        id: existing?.id ?? newId(),
        name: trimmed,
        filters,
        createdAt: new Date().toISOString(),
      };
      persist(
        existing
          ? current.map((item) => (item.id === existing.id ? entry : item))
          : [...current, entry],
      );
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => persist(latest.current.filter((item) => item.id !== id)),
    [persist],
  );

  return useMemo(
    () => ({ items, loading, error, save, remove }),
    [items, loading, error, save, remove],
  );
}
