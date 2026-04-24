import { useCallback, useMemo, useState } from "react";
import type { CollectionControl, Filter, PageInfo, SortState } from "@/types/collection";
import type { Column, UseDataTableOptions, UseDataTableReturn } from "./types";

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
    onClickRow,
    rowActions,
    onSelectionChange,
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
  const totalPages =
    total !== null && pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : null;
  const hasPrevPage = pageInfo.hasPreviousPage || (control?.cursorStack.length ?? 0) > 0;
  const hasNextPage = pageInfo.hasNextPage;

  // ---------------------------------------------------------------------------
  // Column visibility management
  // ---------------------------------------------------------------------------
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const getColumnKey = useCallback((col: Column<TRow>, colIndex: number): string => {
    return col.id ?? col.label ?? String(colIndex);
  }, []);

  const visibleColumns = useMemo<Column<TRow>[]>(() => {
    return allColumns.filter((col, i) => !hiddenColumns.has(getColumnKey(col, i)));
  }, [allColumns, hiddenColumns, getColumnKey]);

  const toggleColumn = useCallback((fieldOrId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(fieldOrId)) {
        next.delete(fieldOrId);
      } else {
        next.add(fieldOrId);
      }
      return next;
    });
  }, []);

  const showAllColumns = useCallback(() => {
    setHiddenColumns(new Set());
  }, []);

  const hideAllColumns = useCallback(() => {
    const allKeys = new Set(allColumns.map((col, i) => getColumnKey(col, i)));
    setHiddenColumns(allKeys);
  }, [allColumns, getColumnKey]);

  const isColumnVisible = useCallback(
    (fieldOrId: string) => !hiddenColumns.has(fieldOrId),
    [hiddenColumns],
  );

  // ---------------------------------------------------------------------------
  // Pagination actions (delegated to control)
  // ---------------------------------------------------------------------------
  const nextPage = useCallback(
    (cursor: string) => {
      control?.nextPage(cursor);
    },
    [control],
  );

  const prevPage = useCallback(
    (cursor?: string) => {
      control?.prevPage(cursor);
    },
    [control],
  );

  // ---------------------------------------------------------------------------
  // Sort (delegated from control)
  // ---------------------------------------------------------------------------
  const sortStates = useMemo<SortState[]>(() => {
    return control?.sortStates ?? [];
  }, [control?.sortStates]);

  const onSort = useMemo<((field: string, direction?: "Asc" | "Desc") => void) | undefined>(() => {
    if (!control) return undefined;
    return (field: string, direction?: "Asc" | "Desc") =>
      control.setSort(field as TFieldName, direction);
  }, [control]);

  // ---------------------------------------------------------------------------
  // Row selection
  // ---------------------------------------------------------------------------
  const getRowId = useCallback((row: TRow): string | null => {
    const id = (row as Record<string, unknown>)["id"];
    return id != null ? String(id) : null;
  }, []);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const isRowSelected = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      if (id === null) return false;
      return selectedRowIds.has(id);
    },
    [selectedRowIds, getRowId],
  );

  const toggleRowSelection = onSelectionChange
    ? (row: TRow) => {
        const id = getRowId(row);
        if (id === null) return;
        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          onSelectionChange([...next]);
          return next;
        });
      }
    : undefined;

  const selectAllRows = onSelectionChange
    ? () => {
        const allIds = new Set(
          rows.map((r) => getRowId(r)).filter((id): id is string => id !== null),
        );
        setSelectedRowIds(allIds);
        onSelectionChange([...allIds]);
      }
    : undefined;

  const clearSelection = onSelectionChange
    ? () => {
        setSelectedRowIds(new Set());
        onSelectionChange([]);
      }
    : undefined;

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
    pageSize,
    nextPage,
    prevPage,
    hasPrevPage,
    hasNextPage,
    columns: allColumns,
    visibleColumns,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    isColumnVisible,
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
  };
}
