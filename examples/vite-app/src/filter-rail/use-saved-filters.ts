// ✅ Reusable Component: localStorage-backed saved filters for `FilterRail`.
//
// A companion, not part of the component — the same seam as `useLocalFacetCounts`.
// The rail takes `items` and two callbacks and does not care where they live;
// this is the simple case.
//
// Swap it for a GraphQL-backed store and saved filters become shared with the
// team and follow you across devices, with no change to the rail. That choice
// belongs to the app: localStorage is private to one browser, survives
// redeploys, and vanishes with site data.

import { useCallback, useState } from "react";
import type { Filter } from "@tailor-platform/app-shell";
import type { SavedFilter } from "./types";

const read = (key: string): SavedFilter[] => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedFilter[]) : [];
  } catch {
    // Private windows and cleared site data both land here.
    return [];
  }
};

const write = (key: string, items: SavedFilter[]) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Storage disabled or full — the session keeps working in memory.
  }
};

export function useSavedFilters(storageKey: string) {
  const [items, setItems] = useState<SavedFilter[]>(() => read(storageKey));

  const persist = useCallback(
    (next: SavedFilter[]) => {
      setItems(next);
      write(storageKey, next);
    },
    [storageKey],
  );

  const onSave = useCallback(
    (name: string, filters: Filter[]) => {
      // Saving over an existing name replaces it rather than making a second
      // entry — two "Low stock" rows a user cannot tell apart is worse than
      // losing the older definition they were clearly trying to update.
      const existing = items.find((item) => item.name.toLowerCase() === name.toLowerCase());
      const entry: SavedFilter = {
        id: existing?.id ?? `sf-${Date.now().toString(36)}`,
        name,
        createdAt: new Date().toISOString(),
        filters,
      };
      persist(existing ? items.map((i) => (i.id === existing.id ? entry : i)) : [...items, entry]);
    },
    [items, persist],
  );

  const onDelete = useCallback(
    (item: SavedFilter) => persist(items.filter((i) => i.id !== item.id)),
    [items, persist],
  );

  return { items, onSave, onDelete };
}
