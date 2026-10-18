import { useCallback, useMemo, useState } from "react";
import { EMPTY_RAIL_LAYOUT } from "./apply-layout";
import { readStorage, removeStorage, stringArray, writeStorage } from "./storage";
import type { RailLayout, RailLayoutBinding, UserOptionSort } from "./types";

const STORAGE_PREFIX = "as:filter-rail-layout:v1:";
const SORTS = new Set<UserOptionSort>(["given", "label"]);

/** Read defensively — a rail that throws on load is worse than one that forgets. */
const parseLayout = (raw: unknown): RailLayout => {
  if (!raw || typeof raw !== "object") return EMPTY_RAIL_LAYOUT;
  const value = raw as Record<string, unknown>;
  // Null prototype: ids come from storage, so "__proto__" must stay a plain key.
  const sort = Object.create(null) as Record<string, UserOptionSort>;
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

  // Re-hydrate during render when the key changes (a different screen reusing
  // the component), so the old layout never paints under the new key.
  const [loadedKey, setLoadedKey] = useState(key);
  if (loadedKey !== key) {
    setLoadedKey(key);
    setValue(readStorage(key, parseLayout, EMPTY_RAIL_LAYOUT));
  }

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
