import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Per-user, per-table column layout persisted to `localStorage`.
 *
 * - `order` — column keys in display order.
 * - `hidden` — column keys the user has hidden.
 * - `pinned` — column key → edge the column is frozen to (`"none"` explicitly
 *   unpins a column whose default `pin` is set).
 */
export interface PersistedColumnState {
  order: string[];
  hidden: string[];
  pinned: Record<string, "left" | "right" | "none">;
}

// `as` = AppShell (the Tailwind class prefix is `astw` — "AppShell TailWind" —
// but the "tw" has no meaning for a storage key, so it's dropped here). The
// `v1` segment lets a future shape change orphan old data by bumping the
// version instead of migrating it.
const STORAGE_PREFIX = "as:data-table:v1:";

function storageKey(tableId: string): string {
  return `${STORAGE_PREFIX}${tableId}`;
}

function isPersistedColumnState(value: unknown): value is PersistedColumnState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.order) &&
    Array.isArray(v.hidden) &&
    !!v.pinned &&
    typeof v.pinned === "object" &&
    !Array.isArray(v.pinned)
  );
}

/** Best-effort read; returns `null` on SSR, missing, corrupt, or blocked storage. */
function readState(tableId: string): PersistedColumnState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(tableId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPersistedColumnState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Best-effort write; silently ignores SSR / quota / privacy-mode errors. */
function writeState(tableId: string, state: PersistedColumnState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(tableId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

type CachedState = {
  raw: string | null;
  defaults: PersistedColumnState;
  state: PersistedColumnState;
};

const stateCache = new Map<string, CachedState>();
const stateListeners = new Map<string, Set<() => void>>();

function readCachedState(tableId: string, defaults: PersistedColumnState): PersistedColumnState {
  if (typeof window === "undefined") return defaults;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(storageKey(tableId));
  } catch {
    // Keep the in-memory value when storage is unavailable.
  }

  const cached = stateCache.get(tableId);
  if (cached && cached.raw === raw && (raw !== null || cached.defaults === defaults)) {
    return cached.state;
  }

  const state = readState(tableId) ?? defaults;
  stateCache.set(tableId, { raw, defaults, state });
  return state;
}

function notifyStateListeners(tableId: string): void {
  for (const listener of stateListeners.get(tableId) ?? []) listener();
}

function subscribeToState(tableId: string | undefined, listener: () => void): () => void {
  if (!tableId || typeof window === "undefined") return () => {};

  const listeners = stateListeners.get(tableId) ?? new Set<() => void>();
  listeners.add(listener);
  stateListeners.set(tableId, listeners);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey(tableId)) return;
    stateCache.delete(tableId);
    listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stateListeners.delete(tableId);
    window.removeEventListener("storage", onStorage);
  };
}

// Tracks currently-mounted `tableId`s (dev aid). Two tables sharing an id map
// to the same localStorage key and clobber each other's layout, so warn.
const mountedTableIds = new Map<string, number>();

/**
 * SSR-safe `localStorage`-backed column state.
 *
 * `localStorage` is the source of truth for persistent tables. `useSyncExternalStore`
 * supplies the server default during hydration, then subscribes to storage updates
 * without mirroring the value through an effect. Without `tableId`, state remains
 * local to this hook instance.
 */
export function usePersistentColumnState(
  tableId: string | undefined,
  defaults: PersistedColumnState,
): [PersistedColumnState, (updater: (prev: PersistedColumnState) => PersistedColumnState) => void] {
  const [memoryState, setMemoryState] = useState<PersistedColumnState>(defaults);
  const subscribe = useCallback(
    (listener: () => void) => subscribeToState(tableId, listener),
    [tableId],
  );
  const getSnapshot = useCallback(
    () => (tableId ? readCachedState(tableId, defaults) : defaults),
    [defaults, tableId],
  );
  const persistedState = useSyncExternalStore(subscribe, getSnapshot, () => defaults);
  const state = tableId ? persistedState : memoryState;

  // Warn when two mounted tables share a `tableId` — they persist to the same
  // localStorage key and overwrite each other. Counted so React StrictMode's
  // mount/unmount/remount doesn't trip a false positive.
  useEffect(() => {
    if (!tableId) return;
    const count = (mountedTableIds.get(tableId) ?? 0) + 1;
    mountedTableIds.set(tableId, count);
    if (count > 1) {
      console.warn(
        `[DataTable] Duplicate tableId "${tableId}": multiple tables share one localStorage key and will clobber each other's column layout. Use a unique id per table (e.g. "<route>:<entity>").`,
      );
    }
    return () => {
      const remaining = (mountedTableIds.get(tableId) ?? 1) - 1;
      if (remaining <= 0) mountedTableIds.delete(tableId);
      else mountedTableIds.set(tableId, remaining);
    };
  }, [tableId]);

  const setState = useCallback(
    (updater: (prev: PersistedColumnState) => PersistedColumnState) => {
      if (!tableId) {
        setMemoryState(updater);
        return;
      }

      const next = updater(readCachedState(tableId, defaults));
      writeState(tableId, next);
      stateCache.set(tableId, {
        raw: typeof window === "undefined" ? null : JSON.stringify(next),
        defaults,
        state: next,
      });
      notifyStateListeners(tableId);
    },
    [defaults, tableId],
  );

  return [state, setState];
}
