// ✅ Reusable Component: localStorage-backed rail layout.
//
// The third companion, alongside `useLocalFacetCounts` and `useSavedFilters`,
// and the same seam: the rail takes a value and a callback and does not care
// where they live.
//
// Which store you pick is a real product decision, not a detail. localStorage
// means "how *I* like this screen arranged", private to one browser. A
// GraphQL-backed store means the team shares one arrangement — which is right
// for a shop that trains people on a fixed layout, and wrong for one where a
// buyer and a merchandiser want different facets first. Same component either
// way.

import { useCallback, useState } from "react";
import { EMPTY_RAIL_LAYOUT, type RailLayout, type RailLayoutBinding } from "./types";

const read = (key: string): RailLayout => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY_RAIL_LAYOUT;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_RAIL_LAYOUT;
    const value = parsed as Partial<RailLayout>;
    // Read defensively rather than trusting the shape. This survives a schema
    // change and a half-written value; a rail that throws on load is worse than
    // one that forgets an arrangement.
    return {
      order: Array.isArray(value.order) ? value.order.filter((id) => typeof id === "string") : [],
      hidden: Array.isArray(value.hidden)
        ? value.hidden.filter((id) => typeof id === "string")
        : [],
      sort: value.sort && typeof value.sort === "object" ? value.sort : {},
    };
  } catch {
    // Private windows and cleared site data both land here.
    return EMPTY_RAIL_LAYOUT;
  }
};

const write = (key: string, value: RailLayout) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage disabled or full — the session keeps working in memory.
  }
};

export function useRailLayout(storageKey: string): RailLayoutBinding {
  const [value, setValue] = useState<RailLayout>(() => read(storageKey));

  const onChange = useCallback(
    (next: RailLayout) => {
      setValue(next);
      write(storageKey, next);
    },
    [storageKey],
  );

  const onReset = useCallback(() => {
    setValue(EMPTY_RAIL_LAYOUT);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // As above — losing the removal is not worth failing the reset over.
    }
  }, [storageKey]);

  return { value, onChange, onReset };
}
