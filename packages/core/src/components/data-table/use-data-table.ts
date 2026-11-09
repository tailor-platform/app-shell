import { useCallback, useMemo } from "react";
import type { CollectionControl, Filter, PageInfo, SortState } from "@/types/collection";
import { useColumns } from "./use-columns";
import { usePageCounter } from "./use-page-counter";
import { useRowExpansion } from "./use-row-expansion";
import { useRowSelection } from "./use-row-selection";
import type { UseDataTableOptions, UseDataTableReturn } from "./types";

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
  const {
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
  } = useColumns(allColumns, tableId);

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
  // Row selection and expansion share one row-id convention.
  // ---------------------------------------------------------------------------
  const getRowId = useCallback((row: TRow): string | null => {
    const id = (row as Record<string, unknown>)["id"];
    return id != null ? String(id) : null;
  }, []);

  const {
    selectedIds,
    isRowSelected,
    toggleRowSelection,
    selectAllRows,
    deselectAllRows,
    clearSelection,
    pendingActionId,
    runSelectionAction,
    isAllSelected,
    isIndeterminate,
  } = useRowSelection(rows, rowSelection, onSelectionChange, getRowId);

  const {
    expandedIds: expandedIdsList,
    isRowExpanded,
    toggleRowExpansion,
    collapseAllRows,
  } = useRowExpansion(rowExpansion, getRowId);

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
    rowSelection,
    selectedIds,
    isRowSelected,
    toggleRowSelection,
    selectAllRows,
    deselectAllRows,
    clearSelection,
    pendingActionId,
    runSelectionAction,
    isAllSelected,
    isIndeterminate,
    expandedIds: expandedIdsList,
    isRowExpanded,
    toggleRowExpansion,
    collapseAllRows,
    rowExpansion,
  };
}
