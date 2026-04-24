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
import { useCursorPagination } from "./use-cursor-pagination";

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
// Returns `unknown` so that both overload return types (which are mutually
// incompatible via CollectionControl's contravariant TFieldName) are assignable
// to it — every type is assignable to `unknown`. Callers always see the narrower
// type from the overload signatures above, never `unknown`.
export function useCollectionVariables(
  options: UseCollectionOptions & { tableMetadata?: TableMetadata },
): unknown {
  const { params = {} } = options;
  const { initialFilters = [], initialSort = [], pageSize: initialPageSize = 20 } = params;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [filters, setFiltersState] = useState<Filter[]>(initialFilters);
  const [sortStates, setSortStates] = useState<SortState[]>(initialSort);

  const {
    pageSize,
    paginationVariables,
    goToNextPage,
    goToPrevPage,
    resetPage,
    goToFirstPage,
    goToLastPage,
    setPageSize,
    getHasPrevPage,
    getHasNextPage,
    resetCount,
  } = useCursorPagination(initialPageSize);

  // ---------------------------------------------------------------------------
  // Filter operations
  // ---------------------------------------------------------------------------
  const addFilter = useCallback(
    (field: string, operator: FilterOperator, value: unknown) => {
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
      resetPage();
    },
    [resetPage],
  );

  const setFilters = useCallback(
    (newFilters: Filter[]) => {
      setFiltersState(newFilters);
      resetPage();
    },
    [resetPage],
  );

  const removeFilter = useCallback(
    (field: string) => {
      setFiltersState((prev) => prev.filter((f) => f.field !== field));
      resetPage();
    },
    [resetPage],
  );

  const clearFilters = useCallback(() => {
    setFiltersState([]);
    resetPage();
  }, [resetPage]);

  // ---------------------------------------------------------------------------
  // Sort operations
  // ---------------------------------------------------------------------------
  const setSort = useCallback(
    (field: string, direction?: "Asc" | "Desc") => {
      setSortStates((prev) => {
        if (direction === undefined) {
          return prev.filter((s) => s.field !== field);
        }
        const newState: SortState = { field, direction };
        const filtered = prev.filter((s) => s.field !== field);
        return [...filtered, newState];
      });
      resetPage();
    },
    [resetPage],
  );

  const clearSort = useCallback(() => {
    setSortStates([]);
    resetPage();
  }, [resetPage]);

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

  const variables = useMemo<CollectionVariables>(
    () => ({
      query: queryVars,
      order: orderVars,
      pagination: paginationVariables,
    }),
    [queryVars, orderVars, paginationVariables],
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
      goToNextPage,
      goToPrevPage,
      resetPage,
      goToFirstPage,
      goToLastPage,
      getHasPrevPage,
      getHasNextPage,
      resetCount,
    },
  };
}
