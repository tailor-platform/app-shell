import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { CollectionControl, Filter, PageInfo, SortState } from "@/types/collection";
import { usePageCounter } from "./use-page-counter";
import { usePersistentColumnState, type PersistedColumnState } from "./use-persistent-column-state";
import type { Column, UseDataTableOptions, UseDataTableReturn } from "./types";

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

function createIdSetStore(initialIds: Iterable<string> = []) {
  let snapshot = new Set(initialIds);
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next: Set<string>) => {
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
  };
}

/**
 * Hook that integrates data management, column visibility, row operations, and
 * sort/pagination state for the `DataTable.*` compound component.
 *
 * @example
 * ```tsx
 * const { variables, control } = useCollectionVariables({ params: { pageSize: 20 } });
 * const [result] = useQuery({
 *   query: GET_ORDERS,
 *   variables: { ...variables.pagination, query: variables.query, order: variables.order },
 * });
 *
 * const table = useDataTable<Order>({
 *   columns,
 *   data: {
 *     rows: result.data?.orders?.edges.map(e => e.node) ?? [],
 *     pageInfo: { ... },
 *     total: result.data?.orders?.total,
 *   },
 *   loading: result.fetching,
 *   control,
 * });
 *
 * <DataTable.Root value={table}>
 *   <DataTable.Table />
 *   <DataTable.Footer>
 *     <DataTable.Pagination />
 *   </DataTable.Footer>
 * </DataTable.Root>
 * ```
 */
export function useDataTable<
  TRow extends Record<string, unknown>,
  TFieldName extends string = string,
  TFilter extends Filter<TFieldName> = Filter<TFieldName>,
>(options: UseDataTableOptions<TRow, TFieldName, TFilter>): UseDataTableReturn<TRow> {
  const {
    columns: allColumns,
    data,
    loading = false,
    error = null,
    control,
    tableId,
    onClickRow,
    rowActions,
    onSelectionChange,
    rowSelection,
    rowExpansion,
    sort: sortOption,
  } = options;

  // ---------------------------------------------------------------------------
  // Data extraction
  // ---------------------------------------------------------------------------
  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);

  const pageInfo: PageInfo = data?.pageInfo ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    endCursor: null,
    startCursor: null,
  };

  const total = data?.total ?? null;

  // ---------------------------------------------------------------------------
  // Pagination (derived from data + control)
  // ---------------------------------------------------------------------------
  const pageSize = control?.pageSize ?? 0;

  const { currentPage, totalPages, increment, decrement, reset, setToLast } = usePageCounter({
    total,
    pageSize,
    resetCount: control?.resetCount ?? 0,
  });

  const hasPrevPage = control?.getHasPrevPage(pageInfo) ?? false;
  const hasNextPage = control?.getHasNextPage(pageInfo) ?? pageInfo.hasNextPage;

  // ---------------------------------------------------------------------------
  // Column visibility / order / pinning (persisted per-user when tableId is set)
  // ---------------------------------------------------------------------------
  const getColumnKey = useCallback((col: Column<TRow>, colIndex: number): string => {
    return col.id ?? col.label ?? String(colIndex);
  }, []);

  // Stable key list + key→column map derived from the current column defs.
  const columnKeys = useMemo(
    () => allColumns.map((col, i) => getColumnKey(col, i)),
    [allColumns, getColumnKey],
  );
  const columnByKey = useMemo(() => {
    const map = new Map<string, Column<TRow>>();
    allColumns.forEach((col, i) => map.set(getColumnKey(col, i), col));
    return map;
  }, [allColumns, getColumnKey]);

  const columnStateKey = JSON.stringify(columnKeys);
  const defaultColumnState = useMemo<PersistedColumnState>(
    () => ({ order: JSON.parse(columnStateKey) as string[], hidden: [], pinned: {} }),
    [columnStateKey],
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

  // ---------------------------------------------------------------------------
  // Pagination actions (delegated to control + page counter sync)
  // ---------------------------------------------------------------------------
  const goToNextPage = useCallback(
    (pi: Pick<PageInfo, "endCursor">) => {
      control?.goToNextPage(pi);
      increment();
    },
    [control, increment],
  );

  const goToPrevPage = useCallback(
    (pi: Pick<PageInfo, "startCursor">) => {
      control?.goToPrevPage(pi);
      decrement();
    },
    [control, decrement],
  );

  const goToFirstPage = useCallback(() => {
    control?.goToFirstPage();
    reset();
  }, [control, reset]);

  const goToLastPage = useCallback(() => {
    control?.goToLastPage(total);
    if (totalPages !== null) setToLast(totalPages);
  }, [control, total, totalPages, setToLast]);

  const setPageSize = useCallback(
    (size: number) => {
      control?.setPageSize(size);
      reset();
    },
    [control, reset],
  );

  // ---------------------------------------------------------------------------
  // Sort (delegated from control)
  // ---------------------------------------------------------------------------
  const sortDisabled = sortOption === false;
  const sortMultiple = sortOption !== false && sortOption?.multiple === true;

  const sortStates = useMemo<SortState[]>(() => {
    if (sortDisabled) return [];
    return control?.sortStates ?? [];
  }, [control?.sortStates, sortDisabled]);

  const onSort = useMemo<((field: string, direction?: "Asc" | "Desc") => void) | undefined>(() => {
    if (sortDisabled || !control) return undefined;
    return (field: string, direction?: "Asc" | "Desc") => {
      if (!sortMultiple && direction !== undefined) {
        control.clearSort();
      }
      control.setSort(field as TFieldName, direction);
    };
  }, [control, sortDisabled, sortMultiple]);

  // ---------------------------------------------------------------------------
  // Row selection
  // ---------------------------------------------------------------------------
  const getRowId = useCallback((row: TRow): string | null => {
    const id = (row as Record<string, unknown>)["id"];
    return id != null ? String(id) : null;
  }, []);

  const [uncontrolledSelectionStore] = useState(() =>
    createIdSetStore(rowSelection?.defaultSelectedIds),
  );
  const uncontrolledSelectedIds = useSyncExternalStore(
    uncontrolledSelectionStore.subscribe,
    uncontrolledSelectionStore.getSnapshot,
    uncontrolledSelectionStore.getSnapshot,
  );
  const controlledSelectedIds = rowSelection?.selectedIds;
  const isSelectionControlled = controlledSelectedIds !== undefined;
  const selectedRowIds = useMemo(
    () => (isSelectionControlled ? new Set(controlledSelectedIds) : uncontrolledSelectedIds),
    [controlledSelectedIds, isSelectionControlled, uncontrolledSelectedIds],
  );
  const selectionOnChange = rowSelection?.onChange ?? onSelectionChange;
  const selectionEnabled = rowSelection !== undefined || onSelectionChange !== undefined;

  const updateSelection = useCallback(
    (next: Set<string>) => {
      if (!isSelectionControlled) uncontrolledSelectionStore.set(next);
      selectionOnChange?.([...next]);
    },
    [isSelectionControlled, selectionOnChange, uncontrolledSelectionStore],
  );

  const isRowSelected = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      return id !== null && selectedRowIds.has(id);
    },
    [getRowId, selectedRowIds],
  );

  const toggleRowSelection = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      if (id === null) return;
      const next = new Set(
        isSelectionControlled ? controlledSelectedIds : uncontrolledSelectionStore.getSnapshot(),
      );
      if (next.has(id)) next.delete(id);
      else next.add(id);
      updateSelection(next);
    },
    [
      controlledSelectedIds,
      getRowId,
      isSelectionControlled,
      uncontrolledSelectionStore,
      updateSelection,
    ],
  );

  const selectAllRows = useCallback(() => {
    const next = new Set(rows.map(getRowId).filter((id): id is string => id !== null));
    updateSelection(next);
  }, [getRowId, rows, updateSelection]);

  const clearSelection = useCallback(() => {
    updateSelection(new Set());
  }, [updateSelection]);

  const selectedIds = useMemo(() => [...selectedRowIds], [selectedRowIds]);

  const selectableCount = rows.filter((r) => getRowId(r) !== null).length;
  const isAllSelected =
    selectableCount > 0 &&
    rows.every((r) => {
      const id = getRowId(r);
      // Rows without id are not selectable — skip them in the check
      return id === null || selectedRowIds.has(id);
    });
  const isIndeterminate = selectedRowIds.size > 0 && !isAllSelected;

  // ---------------------------------------------------------------------------
  // Row expansion
  // ---------------------------------------------------------------------------
  // Keyed by the same `getRowId` as selection — there is one row-id convention.
  const [uncontrolledExpansionStore] = useState(createIdSetStore);
  const uncontrolledExpandedIds = useSyncExternalStore(
    uncontrolledExpansionStore.subscribe,
    uncontrolledExpansionStore.getSnapshot,
    uncontrolledExpansionStore.getSnapshot,
  );

  // Controlled when the caller passes `expandedIds`; internal state is then never written.
  const controlledExpandedIds = rowExpansion?.expandedIds;
  const isExpansionControlled = controlledExpandedIds !== undefined;
  const expandedRowIds = useMemo(
    () => (isExpansionControlled ? new Set(controlledExpandedIds) : uncontrolledExpandedIds),
    [controlledExpandedIds, isExpansionControlled, uncontrolledExpandedIds],
  );
  const onExpandedChange = rowExpansion?.onChange;

  const isRowExpanded = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      return id !== null && expandedRowIds.has(id);
    },
    [expandedRowIds, getRowId],
  );

  const toggleRowExpansionImpl = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      if (id === null) return;
      const next = new Set(
        isExpansionControlled ? controlledExpandedIds : uncontrolledExpansionStore.getSnapshot(),
      );
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (!isExpansionControlled) uncontrolledExpansionStore.set(next);
      onExpandedChange?.([...next]);
    },
    [
      controlledExpandedIds,
      getRowId,
      isExpansionControlled,
      onExpandedChange,
      uncontrolledExpansionStore,
    ],
  );

  const collapseAllRowsImpl = useCallback(() => {
    const current = isExpansionControlled
      ? new Set(controlledExpandedIds)
      : uncontrolledExpansionStore.getSnapshot();
    if (current.size === 0) return;
    const next = new Set<string>();
    if (!isExpansionControlled) uncontrolledExpansionStore.set(next);
    onExpandedChange?.([]);
  }, [controlledExpandedIds, isExpansionControlled, onExpandedChange, uncontrolledExpansionStore]);

  const toggleRowExpansion = rowExpansion ? toggleRowExpansionImpl : undefined;
  const collapseAllRows = rowExpansion ? collapseAllRowsImpl : undefined;

  const expandedIdsList = useMemo(() => [...expandedRowIds], [expandedRowIds]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    rows,
    loading,
    error,
    sortStates,
    onSort,
    pageInfo,
    total,
    totalPages,
    currentPage,
    pageSize,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    setPageSize,
    hasPrevPage,
    hasNextPage,
    columns: allColumns,
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
    control: control as CollectionControl | undefined,
    onClickRow,
    rowActions,
    selectedIds,
    isRowSelected,
    toggleRowSelection: selectionEnabled ? toggleRowSelection : undefined,
    selectAllRows: selectionEnabled ? selectAllRows : undefined,
    clearSelection: selectionEnabled ? clearSelection : undefined,
    isAllSelected,
    isIndeterminate,
    expandedIds: expandedIdsList,
    isRowExpanded,
    toggleRowExpansion,
    collapseAllRows,
    rowExpansion,
  };
}
