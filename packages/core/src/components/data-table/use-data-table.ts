import { useCallback, useMemo, useState } from "react";
import type { PageInfo, SortState } from "@/types/collection";
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
export function useDataTable<TRow extends Record<string, unknown>>(
  options: UseDataTableOptions<TRow>,
): UseDataTableReturn<TRow> {
  const {
    columns: allColumns,
    data,
    loading = false,
    error = null,
    control,
    onClickRow,
    rowActions,
  } = options;

  // ---------------------------------------------------------------------------
  // Data extraction
  // ---------------------------------------------------------------------------
  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);

  const pageInfo: PageInfo = data?.pageInfo ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    nextPageToken: null,
    previousPageToken: null,
  };

  const total = data?.total ?? null;

  // ---------------------------------------------------------------------------
  // Pagination (derived from data + control)
  // ---------------------------------------------------------------------------
  const pageSize = control?.pageSize ?? 0;
  const totalPages =
    total !== null && pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : null;
  const hasPrevPage = pageInfo.hasPreviousPage;
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
    (token: string) => {
      control?.nextPage(token);
    },
    [control],
  );

  const prevPage = useCallback(
    (token: string) => {
      control?.prevPage(token);
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
    return (field: string, direction?: "Asc" | "Desc") => control.setSort(field, direction);
  }, [control]);

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
    control,
    onClickRow,
    rowActions,
  };
}
