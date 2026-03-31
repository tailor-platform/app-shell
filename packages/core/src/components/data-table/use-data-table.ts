import { useCallback, useEffect, useMemo, useState } from "react";
import type { Column, PageInfo, SortState, UseDataTableOptions, UseDataTableReturn } from "./types";

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
 *   data: result.data?.orders,
 *   loading: result.fetching,
 *   control,
 * });
 *
 * <DataTable.Provider value={table}>
 *   <DataTable.Root>
 *     <DataTable.Headers />
 *     <DataTable.Body />
 *   </DataTable.Root>
 * </DataTable.Provider>
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
  const [optimisticRows, setOptimisticRows] = useState<TRow[] | null>(null);

  const sourceRows = useMemo<TRow[]>(() => {
    return data?.edges?.map((e) => e.node) ?? [];
  }, [data]);

  const rows = optimisticRows ?? sourceRows;

  useEffect(() => {
    setOptimisticRows(null);
  }, [sourceRows]);

  const pageInfo = useMemo<PageInfo>(() => {
    return (
      data?.pageInfo ?? {
        hasNextPage: false,
        endCursor: null,
        hasPreviousPage: false,
        startCursor: null,
      }
    );
  }, [data]);

  useEffect(() => {
    if (data?.pageInfo) {
      control?.setPageInfo(data.pageInfo);
    }
    if (data?.total != null) {
      control?.setTotal(data.total);
    }
  }, [data?.pageInfo, data?.total, control]);

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
  // Pagination (delegated from control)
  // ---------------------------------------------------------------------------
  const nextPage = useCallback(
    (endCursor: string) => {
      control?.nextPage(endCursor);
    },
    [control],
  );

  const prevPage = useCallback(
    (startCursor: string) => {
      control?.prevPage(startCursor);
    },
    [control],
  );

  const hasPrevPage = control?.hasPrevPage ?? false;
  const hasNextPage = control?.hasNextPage ?? false;

  // ---------------------------------------------------------------------------
  // Row Operations (Optimistic Updates)
  // ---------------------------------------------------------------------------
  const updateRow = useCallback(
    (rowId: string, fields: Partial<TRow>) => {
      const currentRows = optimisticRows ?? sourceRows;
      const updatedRows = currentRows.map((row) => {
        if ((row as Record<string, unknown>).id === rowId) {
          return { ...row, ...fields };
        }
        return row;
      });
      setOptimisticRows(updatedRows);

      return {
        rollback: () => {
          setOptimisticRows(null);
        },
      };
    },
    [optimisticRows, sourceRows],
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      const currentRows = optimisticRows ?? sourceRows;
      const deletedRow = currentRows.find((row) => (row as Record<string, unknown>).id === rowId);
      const filteredRows = currentRows.filter(
        (row) => (row as Record<string, unknown>).id !== rowId,
      );
      setOptimisticRows(filteredRows);

      return {
        rollback: () => {
          setOptimisticRows(null);
        },
        deletedRow: deletedRow as TRow,
      };
    },
    [optimisticRows, sourceRows],
  );

  const insertRow = useCallback(
    (row: TRow) => {
      const currentRows = optimisticRows ?? sourceRows;
      setOptimisticRows([row, ...currentRows]);

      return {
        rollback: () => {
          setOptimisticRows(null);
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
