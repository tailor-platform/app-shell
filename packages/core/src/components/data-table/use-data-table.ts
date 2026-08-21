import { useCallback, useMemo } from "react";
import type { CollectionControl, Filter, PageInfo, SortState } from "@/types/collection";
import { usePageCounter } from "./use-page-counter";
import { useDataTableColumns } from "./use-data-table-columns";
import { useDataTableSelection } from "./use-data-table-selection";
import { useDataTableExpansion } from "./use-data-table-expansion";
import type { UseDataTableOptions, UseDataTableReturn } from "./types";

function useDataTablePagination<TFieldName extends string>({
  control,
  pageInfo,
  total,
}: {
  control?: CollectionControl<TFieldName>;
  pageInfo: PageInfo;
  total: number | null;
}) {
  const pageSize = control?.pageSize ?? 0;

  const { currentPage, totalPages, increment, decrement, reset, setToLast } = usePageCounter({
    total,
    pageSize,
    resetCount: control?.resetCount ?? 0,
  });

  const hasPrevPage = control?.getHasPrevPage(pageInfo) ?? false;
  const hasNextPage = control?.getHasNextPage(pageInfo) ?? pageInfo.hasNextPage;

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

  return {
    currentPage,
    totalPages,
    pageSize,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    setPageSize,
    hasPrevPage,
    hasNextPage,
  };
}

function useDataTableSort<TFieldName extends string>({
  control,
  sort,
}: {
  control?: CollectionControl<TFieldName>;
  sort?: UseDataTableOptions<Record<string, unknown>, TFieldName>["sort"];
}) {
  const sortDisabled = sort === false;
  const sortMultiple = sort !== false && sort?.multiple === true;

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

  return { sortStates, onSort };
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
    rowExpansion,
    sort: sortOption,
  } = options;

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);

  const pageInfo: PageInfo = data?.pageInfo ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    endCursor: null,
    startCursor: null,
  };

  const total = data?.total ?? null;

  const {
    currentPage,
    totalPages,
    pageSize,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    setPageSize,
    hasPrevPage,
    hasNextPage,
  } = useDataTablePagination({ control, pageInfo, total });

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
  } = useDataTableColumns({ columns: allColumns, tableId });

  const { sortStates, onSort } = useDataTableSort<TFieldName>({
    control,
    sort: sortOption,
  });

  const getRowId = useCallback((row: TRow): string | null => {
    const id = (row as Record<string, unknown>)["id"];
    return id != null ? String(id) : null;
  }, []);

  const {
    selectedIds,
    isRowSelected,
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    isAllSelected,
    isIndeterminate,
  } = useDataTableSelection({ rows, getRowId, onSelectionChange });

  const { expandedIds, isRowExpanded, toggleRowExpansion, collapseAllRows } = useDataTableExpansion(
    {
      getRowId,
      rowExpansion,
    },
  );

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
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    expandedIds,
    isRowExpanded,
    toggleRowExpansion,
    collapseAllRows,
    rowExpansion,
  };
}
