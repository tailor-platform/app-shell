import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CollectionControl,
  CollectionVariables,
  Filter,
  FilterOperator,
  SortState,
  TableFieldName,
  TableMetadata,
  TableMetadataFilter,
  TypedCollectionVariables,
  UseCollectionOptions,
  UseCollectionReturn,
} from "@/types/collection";
import { useCursorPagination } from "./use-cursor-pagination";

// -----------------------------------------------------------------------------
// Case-insensitive regex conversion helpers
// -----------------------------------------------------------------------------

/** Escape special regex characters in a string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Convert a string filter operator + value into a case-insensitive regex pattern.
 * The resulting string is intended for the Tailor Platform `regex` operator.
 */
function toCaseInsensitiveRegex(operator: FilterOperator, value: string): string {
  const escaped = escapeRegex(value);
  switch (operator) {
    case "eq":
      return `(?i)^${escaped}$`;
    case "ne":
      return `(?i)^(?!${escaped}$).*$`;
    case "contains":
      return `(?i)${escaped}`;
    case "notContains":
      return `(?i)^(?!.*${escaped}).*$`;
    case "hasPrefix":
      return `(?i)^${escaped}`;
    case "hasSuffix":
      return `(?i)${escaped}$`;
    case "notHasPrefix":
      return `(?i)^(?!${escaped})`;
    case "notHasSuffix":
      return `(?i)^(?!.*${escaped}$).*$`;
    default:
      return `(?i)${escaped}`;
  }
}

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
  TypedCollectionVariables<TTable>,
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
  const { params = {}, onParamsChange } = options;
  const initialFilters = params.initialFilters ?? [];
  const initialSort = params.initialSort ?? [];
  const initialPageSize = params.pageSize ?? 20;

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
  const onParamsChangeRef = useRef(onParamsChange);
  const didMountRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Filter operations
  // ---------------------------------------------------------------------------
  const addFilter = useCallback(
    (
      field: string,
      operator: FilterOperator,
      value: unknown,
      filterOptions?: { caseSensitive?: boolean },
    ) => {
      setFiltersState((prev) => {
        const existing = prev.findIndex((f) => f.field === field);
        const newFilter: Filter = {
          field,
          operator,
          value,
          caseSensitive: filterOptions?.caseSensitive,
        };
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
      if (filter.caseSensitive === false && typeof filter.value === "string") {
        filterQuery[filter.field] = {
          regex: toCaseInsensitiveRegex(filter.operator, filter.value),
        };
      } else {
        filterQuery[filter.field] = { [filter.operator]: filter.value };
      }
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

  useEffect(() => {
    onParamsChangeRef.current = onParamsChange;
  }, [onParamsChange]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    onParamsChangeRef.current?.({
      initialFilters: filters,
      initialSort: sortStates,
      pageSize,
    });
  }, [filters, sortStates, pageSize]);

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
