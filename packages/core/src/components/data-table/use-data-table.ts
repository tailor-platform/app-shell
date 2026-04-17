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
    rowKey = "id",
  } = options;

  // ---------------------------------------------------------------------------
  // Data extraction
  // ---------------------------------------------------------------------------
  const [optimisticRows, setOptimisticRows] = useState<TRow[] | null>(null);

  const sourceRows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const rows = optimisticRows ?? sourceRows;

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
  const currentPage = control?.currentPage ?? 1;
  const totalPages =
    total !== null && pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : null;
  const hasPrevPage = currentPage > 1;
  const hasNextPage = totalPages !== null ? currentPage < totalPages : pageInfo.hasNextPage;

  // ---------------------------------------------------------------------------
  // Column visibility management
  // ---------------------------------------------------------------------------
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const getColumnKey = useCallback((col: Column<TRow>): string => {
    return col.id ?? col.label ?? "";
  }, []);

  const visibleColumns = useMemo<Column<TRow>[]>(() => {
    return allColumns.filter((col) => !hiddenColumns.has(getColumnKey(col)));
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
    const allKeys = new Set(allColumns.map(getColumnKey));
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
  // Row Operations (Optimistic Updates)
  // ---------------------------------------------------------------------------
  const updateRow = useCallback(
    (rowId: string, fields: Partial<TRow>) => {
      const currentRows = optimisticRows ?? sourceRows;
      const previousRows = currentRows;
      const updatedRows = currentRows.map((row) => {
        if ((row as Record<string, unknown>)[rowKey] === rowId) {
          return { ...row, ...fields };
        }
        return row;
      });
      setOptimisticRows(updatedRows);

      return {
        rollback: () => {
          setOptimisticRows(previousRows);
        },
      };
    },
    [optimisticRows, sourceRows, rowKey],
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      const currentRows = optimisticRows ?? sourceRows;
      const previousRows = currentRows;
      const deletedRow = currentRows.find(
        (row) => (row as Record<string, unknown>)[rowKey] === rowId,
      );
      const filteredRows = currentRows.filter(
        (row) => (row as Record<string, unknown>)[rowKey] !== rowId,
      );
      setOptimisticRows(filteredRows);

      return {
        rollback: () => {
          setOptimisticRows(previousRows);
        },
        deletedRow,
      };
    },
    [optimisticRows, sourceRows, rowKey],
  );

  const insertRow = useCallback(
    (row: TRow) => {
      const currentRows = optimisticRows ?? sourceRows;
      const previousRows = currentRows;
      setOptimisticRows([row, ...currentRows]);

      return {
        rollback: () => {
          setOptimisticRows(previousRows);
        },
      };
    },
    [optimisticRows, sourceRows],
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
    updateRow,
    deleteRow,
    insertRow,
    control,
    onClickRow,
    rowActions,
  };
}
