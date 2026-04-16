import { useCallback, useMemo, useState } from "react";
import type {
  BuildQueryVariables,
  CollectionControl,
  CollectionVariables,
  Filter,
  FilterOperator,
  PaginationVariables,
  SortState,
  TableFieldName,
  TableMetadata,
  TableMetadataFilter,
  TableOrderableFieldName,
  UseCollectionOptions,
  UseCollectionReturn,
} from "@/types/collection";

// -----------------------------------------------------------------------------
// Overload signatures
// -----------------------------------------------------------------------------

/**
 * Hook for managing collection query parameters (filters, sort, pagination)
 * with metadata-based field name typing and automatic `fieldType` detection.
 *
 * Returns `variables` with `query`, `order`, and `pagination` sub-properties
 * that can be mapped to GraphQL query variables.
 *
 * @example
 * ```tsx
 * import { tableMetadata } from "./generated/data-viewer-metadata.generated";
 *
 * const { variables } = useCollectionVariables({
 *   tableMetadata: tableMetadata.task,
 *   params: { pageSize: 20 },
 * });
 * const { query, order, pagination } = variables;
 * const [result] = useQuery({
 *   query: GET_TASKS,
 *   variables: { ...pagination, query, order },
 * });
 * ```
 */
export function useCollectionVariables<const TTable extends TableMetadata>(
  options: UseCollectionOptions<TableFieldName<TTable>, TableMetadataFilter<TTable>> & {
    tableMetadata: TTable;
  },
): UseCollectionReturn<
  TableFieldName<TTable>,
  {
    query: BuildQueryVariables<TTable> | undefined;
    order:
      | {
          field: TableOrderableFieldName<TTable>;
          direction: "Asc" | "Desc";
        }[]
      | undefined;
    pagination: PaginationVariables;
  },
  TableMetadataFilter<TTable>
>;

/**
 * Hook for managing collection query parameters (filters, sort, pagination).
 *
 * Returns `variables` with `query`, `order`, and `pagination` sub-properties
 * that can be mapped to GraphQL query variables.
 *
 * @example
 * ```tsx
 * const { variables } = useCollectionVariables({ params: { pageSize: 20 } });
 * const { query, order, pagination } = variables;
 * const [result] = useQuery({
 *   query: GET_ORDERS,
 *   variables: { ...pagination, query, order },
 * });
 * ```
 */
export function useCollectionVariables(
  options: UseCollectionOptions & {
    tableMetadata?: never;
  },
): UseCollectionReturn<string, CollectionVariables>;

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------
export function useCollectionVariables(
  options: UseCollectionOptions & {
    tableMetadata?: TableMetadata;
  },
): UseCollectionReturn<string, CollectionVariables> {
  const { params = {} } = options;
  const { initialFilters = [], initialSort = [], pageSize: initialPageSize = 20 } = params;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [filters, setFiltersState] = useState<Filter[]>(initialFilters);
  const [sortStates, setSortStates] = useState<SortState[]>(initialSort);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [cursor, setCursor] = useState<string | null>(null);
  const [paginationDirection, setPaginationDirection] = useState<"forward" | "backward">("forward");
  const [currentPage, setCurrentPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Filter operations
  // ---------------------------------------------------------------------------
  const addFilter = useCallback((field: string, operator: FilterOperator, value: unknown) => {
    setFiltersState((prev) => {
      const existing = prev.findIndex((f) => f.field === field);
      const newFilter: Filter = { field, operator, value };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newFilter;
        return updated;
      }
      return [...prev, newFilter];
    });
    setCursor(null);
    setPaginationDirection("forward");
    setCurrentPage(1);
  }, []);

  const setFilters = useCallback((newFilters: Filter[]) => {
    setFiltersState(newFilters);
    setCursor(null);
    setPaginationDirection("forward");
    setCurrentPage(1);
  }, []);

  const removeFilter = useCallback((field: string) => {
    setFiltersState((prev) => prev.filter((f) => f.field !== field));
    setCursor(null);
    setPaginationDirection("forward");
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState([]);
    setCursor(null);
    setPaginationDirection("forward");
    setCurrentPage(1);
  }, []);

  // ---------------------------------------------------------------------------
  // Sort operations
  // ---------------------------------------------------------------------------
  const setSort = useCallback((field: string, direction?: "Asc" | "Desc") => {
    setSortStates((prev) => {
      if (direction === undefined) {
        return prev.filter((s) => s.field !== field);
      }
      const newState: SortState = { field, direction };
      const filtered = prev.filter((s) => s.field !== field);
      return [...filtered, newState];
    });
    setCursor(null);
    setPaginationDirection("forward");
    setCurrentPage(1);
  }, []);

  const clearSort = useCallback(() => {
    setSortStates([]);
    setCursor(null);
    setPaginationDirection("forward");
    setCurrentPage(1);
  }, []);

  // ---------------------------------------------------------------------------
  // Pagination operations
  // ---------------------------------------------------------------------------
  const nextPage = useCallback((token: string) => {
    setCursor(token);
    setPaginationDirection("forward");
    setCurrentPage((p) => p + 1);
  }, []);

  const prevPage = useCallback((token: string) => {
    setCursor(token);
    setPaginationDirection("backward");
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const resetPage = useCallback(() => {
    setCursor(null);
    setPaginationDirection("forward");
    setCurrentPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCursor(null);
    setPaginationDirection("forward");
    setCurrentPage(1);
  }, []);

  const goToFirstPage = useCallback(() => {
    setCursor(null);
    setPaginationDirection("forward");
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback((lastPage: number) => {
    // Cursor-based pagination has no "jump to page N" — we request the last
    // `pageSize` items by setting direction="backward" with no cursor.
    // The displayed page number may drift if `total` is stale.
    setCursor(null);
    setPaginationDirection("backward");
    setCurrentPage(lastPage);
  }, []);

  // ---------------------------------------------------------------------------
  // Build collection variables (Tailor Platform format)
  // ---------------------------------------------------------------------------
  const queryVars = useMemo(() => {
    if (filters.length === 0) return undefined;
    const filterQuery: Record<string, Record<string, unknown>> = {};
    for (const filter of filters) {
      filterQuery[filter.field] = { [filter.operator]: filter.value };
    }
    return filterQuery;
  }, [filters]);

  const orderVars = useMemo(() => {
    if (sortStates.length === 0) return undefined;
    return sortStates.map((s) => ({
      field: s.field,
      direction: s.direction,
    }));
  }, [sortStates]);

  const paginationVars = useMemo<PaginationVariables>(() => {
    const p: PaginationVariables = {};
    if (paginationDirection === "forward") {
      p.first = pageSize;
      if (cursor) p.after = cursor;
    } else {
      p.last = pageSize;
      if (cursor) p.before = cursor;
    }
    return p;
  }, [pageSize, cursor, paginationDirection]);

  const variables = useMemo<CollectionVariables>(
    () => ({
      query: queryVars,
      order: orderVars,
      pagination: paginationVars,
    }),
    [queryVars, orderVars, paginationVars],
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    variables,
    control: {
      filters,
      addFilter: addFilter as CollectionControl["addFilter"],
      setFilters,
      removeFilter,
      clearFilters,
      sortStates,
      setSort,
      clearSort,
      pageSize,
      setPageSize,
      cursor,
      paginationDirection,
      nextPage,
      prevPage,
      resetPage,
      currentPage,
      goToFirstPage,
      goToLastPage,
    },
  };
}
