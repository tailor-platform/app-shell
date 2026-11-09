import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  isColumnState,
  reconcileColumnOrder,
  type ColumnMeta,
  type ColumnPinOverride,
  type PersistedColumnState,
} from "./column-state";

type Namespace = "data-table" | "line-items";
const mountedIds = new Map<string, number>();
const useCommittedEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;
const storageKey = (namespace: Namespace, tableId: string) => `as:${namespace}:v1:${tableId}`;

function readState(key: string): PersistedColumnState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isColumnState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Shared browser-local persistence; each adapter keeps its original namespace. */
export function usePersistentColumnState(
  tableId: string | undefined,
  defaults: PersistedColumnState,
  namespace: Namespace = "data-table",
) {
  const [state, setStateRaw] = useState(defaults);
  const current = useRef({ state, tableId, namespace, defaults });
  const mounted = useRef(false);
  useCommittedEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useCommittedEffect(() => {
    current.current.tableId = tableId;
    current.current.namespace = namespace;
    current.current.defaults = defaults;
  });
  useEffect(() => {
    if (!tableId) return;
    const key = storageKey(namespace, tableId);
    const count = (mountedIds.get(key) ?? 0) + 1;
    mountedIds.set(key, count);
    if (count > 1)
      console.warn(
        `[${namespace === "data-table" ? "DataTable" : "LineItems"}] Duplicate tableId "${tableId}": multiple tables share one localStorage key and will clobber each other's column layout. Use a unique id per table.`,
      );
    return () => {
      const remaining = (mountedIds.get(key) ?? 1) - 1;
      if (remaining > 0) mountedIds.set(key, remaining);
      else mountedIds.delete(key);
    };
  }, [tableId, namespace]);
  useEffect(() => {
    const next = tableId
      ? (readState(storageKey(namespace, tableId)) ?? current.current.defaults)
      : current.current.defaults;
    current.current.state = next;
    setStateRaw(next);
  }, [tableId, namespace]);
  const setState = useCallback(
    (update: (previous: PersistedColumnState) => PersistedColumnState) => {
      if (!mounted.current) return;
      const owner = current.current;
      const next = update(owner.state);
      if (next === owner.state) return;
      owner.state = next;
      setStateRaw(next);
      // User-driven only, outside React's updater and never during hydration.
      if (owner.tableId && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            storageKey(owner.namespace, owner.tableId),
            JSON.stringify(next),
          );
        } catch {
          /* Preferences remain usable if quota/privacy settings block storage. */
        }
      }
    },
    [],
  );
  return [state, setState] as const;
}

/** Layout preferences do not change document schema, rows, or dirty state. */
export function useColumnLayout(
  columns: readonly ColumnMeta[],
  options: { tableId?: string; namespace: Namespace },
) {
  const ids = useMemo(() => columns.map((column) => column.id), [columns]);
  const defaults = useMemo<PersistedColumnState>(
    () => ({ order: ids, hidden: [], pinned: {} }),
    [ids],
  );
  const [state, setState] = usePersistentColumnState(options.tableId, defaults, options.namespace);
  const currentIds = useRef(ids);
  useCommittedEffect(() => {
    currentIds.current = ids;
  }, [ids]);
  const columnOrder = useMemo(() => reconcileColumnOrder(state.order, ids), [state.order, ids]);
  const hidden = useMemo(() => new Set(state.hidden), [state.hidden]);
  const visibleIds = useMemo(
    () => columnOrder.filter((id) => !hidden.has(id)),
    [columnOrder, hidden],
  );
  const moveColumn = useCallback(
    (id: string, toIndex: number) => {
      setState((previous) => {
        const order = reconcileColumnOrder(previous.order, currentIds.current);
        const from = order.indexOf(id);
        if (from === -1) return previous;
        const target = Math.max(0, Math.min(toIndex, order.length - 1));
        order.splice(from, 1);
        order.splice(target, 0, id);
        return { ...previous, order };
      });
    },
    [setState],
  );
  const setColumnOrder = useCallback(
    (order: readonly string[]) => setState((previous) => ({ ...previous, order: [...order] })),
    [setState],
  );
  const setPin = useCallback(
    (id: string, pin: ColumnPinOverride | null) => {
      if (pin !== null && pin !== "left" && pin !== "right" && pin !== "none")
        throw new Error("Pin must be left, right, none, or null");
      setState((previous) => {
        const pinned = { ...previous.pinned };
        if (pin === null) delete pinned[id];
        else
          Object.defineProperty(pinned, id, {
            value: pin,
            enumerable: true,
            configurable: true,
            writable: true,
          });
        return { ...previous, pinned };
      });
    },
    [setState],
  );
  const toggleColumn = useCallback(
    (id: string) =>
      setState((previous) => {
        const nextHidden = new Set(previous.hidden);
        if (nextHidden.has(id)) nextHidden.delete(id);
        else nextHidden.add(id);
        return { ...previous, hidden: [...nextHidden] };
      }),
    [setState],
  );
  const showAllColumns = useCallback(
    () => setState((previous) => ({ ...previous, hidden: [] })),
    [setState],
  );
  const hideAllColumns = useCallback(
    () => setState((previous) => ({ ...previous, hidden: [...currentIds.current] })),
    [setState],
  );
  const isColumnVisible = useCallback((id: string) => !hidden.has(id), [hidden]);
  return {
    columnOrder,
    pinnedColumns: state.pinned,
    moveColumn,
    setColumnOrder,
    setPin,
    visibleIds,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    isColumnVisible,
  };
}
