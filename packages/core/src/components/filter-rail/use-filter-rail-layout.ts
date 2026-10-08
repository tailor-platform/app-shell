import { useCallback, useEffect, useMemo, useState } from "react";
import { EMPTY_RAIL_LAYOUT } from "./apply-layout";
import { readStorage, removeStorage, stringArray, writeStorage } from "./storage";
import type { RailLayout, RailLayoutBinding, UserOptionSort } from "./types";

const STORAGE_PREFIX = "as:filter-rail-layout:v1:";
const SORTS = new Set<UserOptionSort>(["given", "label", "baselineCount"]);

/** Read defensively — a rail that throws on load is worse than one that forgets. */
const parseLayout = (raw: unknown): RailLayout => {
  if (!raw || typeof raw !== "object") return EMPTY_RAIL_LAYOUT;
  const value = raw as Record<string, unknown>;
  const sort: Record<string, UserOptionSort> = {};
  if (value.sort && typeof value.sort === "object") {
    for (const [id, mode] of Object.entries(value.sort)) {
      if (SORTS.has(mode as UserOptionSort)) sort[id] = mode as UserOptionSort;
    }
  }
  return { order: stringArray(value.order), hidden: stringArray(value.hidden), sort };
};

/**
 * The user's section order, visibility and option sort, persisted to
 * localStorage under `storageKey`. Pass the result to `FilterRail.Root`'s
 * `layout` prop to enable `FilterRail.Settings`.
 *
 * For a team-shared layout, build a `{ value, onChange, onReset }` binding over
 * your own store instead — the rail does not care where it lives.
 */
export function useFilterRailLayout(storageKey: string): RailLayoutBinding {
  const key = STORAGE_PREFIX + storageKey;
  const [value, setValue] = useState<RailLayout>(() =>
    readStorage(key, parseLayout, EMPTY_RAIL_LAYOUT),
  );

  // Re-hydrate when the key changes (a different screen reusing the component).
  useEffect(() => {
    setValue(readStorage(key, parseLayout, EMPTY_RAIL_LAYOUT));
  }, [key]);

  // Written in the setter, not an effect, so mount never clobbers storage.
  const onChange = useCallback(
    (next: RailLayout) => {
      setValue(next);
      writeStorage(key, next);
    },
    [key],
  );

  const onReset = useCallback(() => {
    setValue(EMPTY_RAIL_LAYOUT);
    removeStorage(key);
  }, [key]);

  return useMemo(() => ({ value, onChange, onReset }), [value, onChange, onReset]);
}
