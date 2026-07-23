import { useCallback, useEffect, useRef, useState } from "react";

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

// Tracks currently-mounted `tableId`s (dev aid). Two tables sharing an id map
// to the same localStorage key and clobber each other's layout, so warn.
const mountedTableIds = new Map<string, number>();

/**
 * SSR-safe `localStorage`-backed column state.
 *
 * State initializes to `defaults` so server and first client render produce
 * identical markup (no hydration mismatch); the persisted value is applied in an
 * effect after mount. When `tableId` is `undefined` the hook is pure in-memory
 * state — it never reads from or writes to storage.
 */
export function usePersistentColumnState(
  tableId: string | undefined,
  defaults: PersistedColumnState,
): [PersistedColumnState, (updater: (prev: PersistedColumnState) => PersistedColumnState) => void] {
  const [state, setStateRaw] = useState<PersistedColumnState>(defaults);

  // Keep the latest defaults available to the hydrate effect without making it a
  // dependency — `defaults` is recomputed every render and would thrash it.
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  // Warn when two mounted tables share a `tableId` — they persist to the same
  // storage key and overwrite each other. Counted so React StrictMode's
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

  // Hydrate from storage on mount / when the table id changes. Falls back to the
  // current defaults when there's nothing stored — and when `tableId` is cleared,
  // reset to defaults (in-memory mode) rather than leaking the previous table's
  // persisted layout. This read does NOT write back, so a stored value is never
  // clobbered.
  useEffect(() => {
    setStateRaw(tableId ? (readState(tableId) ?? defaultsRef.current) : defaultsRef.current);
  }, [tableId]);

  // Write imperatively on each user-driven update — never from an effect that
  // watches `state`, which would fire on mount with the pre-hydration default
  // and overwrite the stored value.
  const setState = useCallback(
    (updater: (prev: PersistedColumnState) => PersistedColumnState) => {
      setStateRaw((prev) => {
        const next = updater(prev);
        if (tableId) writeState(tableId, next);
        return next;
      });
    },
    [tableId],
  );

  return [state, setState];
}
