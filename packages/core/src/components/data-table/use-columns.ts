import { useCallback, useMemo } from "react";
import { columnKeyAt } from "./column-layout";
import { usePersistentColumnState, type PersistedColumnState } from "./use-persistent-column-state";
import type { Column } from "./types";

/**
 * Reconcile a persisted column order against the current column keys: keep
 * persisted keys that still exist (in their saved order), then append any new
 * columns in definition order. Pure so `moveColumn` can reconcile from `prev`
 * inside its state updater (not a captured value), keeping batched moves correct.
 */
function reconcileColumnOrder(order: string[], columnKeys: string[]): string[] {
  const present = new Set(columnKeys);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const key of order) {
    if (present.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }
  for (const key of columnKeys) {
    if (!seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }
  return result;
}

export function useColumns<TRow extends Record<string, unknown>>(
  allColumns: Column<TRow>[],
  tableId: string | undefined,
) {
  // Stable key list + key→column map derived from the current column defs.
  const columnKeys = useMemo(() => allColumns.map((col, i) => columnKeyAt(col, i)), [allColumns]);
  const columnByKey = useMemo(() => {
    const map = new Map<string, Column<TRow>>();
    allColumns.forEach((col, i) => map.set(columnKeyAt(col, i), col));
    return map;
  }, [allColumns]);

  const defaultColumnState = useMemo<PersistedColumnState>(
    () => ({ order: columnKeys, hidden: [], pinned: {} }),
    [columnKeys],
  );

  const [persisted, setPersisted] = usePersistentColumnState(tableId, defaultColumnState);

  // Reconcile the persisted order against the current column defs: keep persisted
  // keys that still exist (in their saved order), then append any new columns in
  // definition order. Self-healing across columns added/removed between sessions.
  const columnOrder = useMemo<string[]>(
    () => reconcileColumnOrder(persisted.order, columnKeys),
    [persisted.order, columnKeys],
  );

  const hiddenColumns = useMemo(() => new Set(persisted.hidden), [persisted.hidden]);
  const pinnedColumns = persisted.pinned;

  const visibleColumns = useMemo<Column<TRow>[]>(() => {
    return columnOrder
      .filter((key) => !hiddenColumns.has(key))
      .map((key) => columnByKey.get(key))
      .filter((col): col is Column<TRow> => col != null);
  }, [columnOrder, hiddenColumns, columnByKey]);

  const toggleColumn = useCallback(
    (fieldOrId: string) => {
      setPersisted((prev) => {
        const hidden = new Set(prev.hidden);
        if (hidden.has(fieldOrId)) {
          hidden.delete(fieldOrId);
        } else {
          hidden.add(fieldOrId);
        }
        return { ...prev, hidden: [...hidden] };
      });
    },
    [setPersisted],
  );

  const showAllColumns = useCallback(() => {
    setPersisted((prev) => ({ ...prev, hidden: [] }));
  }, [setPersisted]);

  const hideAllColumns = useCallback(() => {
    setPersisted((prev) => ({ ...prev, hidden: [...columnKeys] }));
  }, [setPersisted, columnKeys]);

  const isColumnVisible = useCallback(
    (fieldOrId: string) => !hiddenColumns.has(fieldOrId),
    [hiddenColumns],
  );

  const moveColumn = useCallback(
    (key: string, toIndex: number) => {
      // Reconcile from `prev` (not the captured `columnOrder`) so several moves
      // batched before a re-render compose correctly instead of clobbering.
      setPersisted((prev) => {
        const order = reconcileColumnOrder(prev.order, columnKeys);
        const from = order.indexOf(key);
        if (from === -1) return prev;
        const clamped = Math.max(0, Math.min(toIndex, order.length - 1));
        order.splice(from, 1);
        order.splice(clamped, 0, key);
        return { ...prev, order };
      });
    },
    [setPersisted, columnKeys],
  );

  const setColumnOrder = useCallback(
    (keys: string[]) => {
      setPersisted((prev) => ({ ...prev, order: keys }));
    },
    [setPersisted],
  );

  const setPin = useCallback(
    (key: string, side: "left" | "right" | "none" | null) => {
      setPersisted((prev) => {
        const pinned = { ...prev.pinned };
        // `null` clears the override (reverts to the column's default `pin`);
        // `"none"` explicitly unpins a column even if its default is pinned.
        if (side === null) {
          delete pinned[key];
        } else {
          pinned[key] = side;
        }
        return { ...prev, pinned };
      });
    },
    [setPersisted],
  );

  return {
    visibleColumns,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    isColumnVisible,
    columnOrder,
    moveColumn,
    setColumnOrder,
    pinnedColumns,
    setPin,
  };
}
