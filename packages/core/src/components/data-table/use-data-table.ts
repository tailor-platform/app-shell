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
// Overload: explicit rowKey with inferred TKey — rowId is typed as TRow[TKey]
export function useDataTable<
  TRow extends Record<string, unknown>,
  const TKey extends keyof TRow & string,
>(options: UseDataTableOptions<TRow> & { rowKey: TKey }): UseDataTableReturn<TRow, TRow[TKey]>;

// Overload: no explicit rowKey — rowId stays string (default key "id" is typically string)
export function useDataTable<TRow extends Record<string, unknown>>(
  options: UseDataTableOptions<TRow>,
): UseDataTableReturn<TRow, string>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDataTable<TRow extends Record<string, unknown>>(
  options: UseDataTableOptions<TRow>,
): UseDataTableReturn<TRow, any> {
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

  // `optimisticState` pairs the optimistic row list with the `sourceRows`
  // reference it was applied against. When `data` changes (server refetch
  // completes), `sourceRows` gets a new reference and the comparison fails,
  // automatically falling back to fresh server rows — no useEffect needed.
  const [optimisticState, setOptimisticState] = useState<{
    baseRows: TRow[];
    rows: TRow[];
  } | null>(null);

  const sourceRows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const rows =
    optimisticState !== null && optimisticState.baseRows === sourceRows
      ? optimisticState.rows
      : sourceRows;

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
  // Row Operations (Optimistic Updates)
  // ---------------------------------------------------------------------------
  const updateRow = useCallback(
    (rowId: string, fields: Partial<TRow>) => {
      const currentRows = optimisticState?.rows ?? sourceRows;
      const previousState = optimisticState;
      const updatedRows = currentRows.map((row) => {
        if ((row as Record<string, unknown>)[rowKey] === rowId) {
          return { ...row, ...fields };
        }
        return row;
      });
      setOptimisticState({ baseRows: sourceRows, rows: updatedRows });

      return {
        rollback: () => {
          setOptimisticState(previousState);
        },
      };
    },
    [optimisticState, sourceRows, rowKey],
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      const currentRows = optimisticState?.rows ?? sourceRows;
      const previousState = optimisticState;
      const deletedRow = currentRows.find(
        (row) => (row as Record<string, unknown>)[rowKey] === rowId,
      );
      const filteredRows = currentRows.filter(
        (row) => (row as Record<string, unknown>)[rowKey] !== rowId,
      );
      setOptimisticState({ baseRows: sourceRows, rows: filteredRows });

      return {
        rollback: () => {
          setOptimisticState(previousState);
        },
        deletedRow,
      };
    },
    [optimisticState, sourceRows, rowKey],
  );

  const insertRow = useCallback(
    (row: TRow) => {
      const currentRows = optimisticState?.rows ?? sourceRows;
      const previousState = optimisticState;
      setOptimisticState({ baseRows: sourceRows, rows: [row, ...currentRows] });

      return {
        rollback: () => {
          setOptimisticState(previousState);
        },
      };
    },
    [optimisticState, sourceRows],
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
    rowKey: rowKey as string,
    control,
    onClickRow,
    rowActions,
  };
}
