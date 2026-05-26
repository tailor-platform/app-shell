import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
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
// Reducer
// -----------------------------------------------------------------------------

interface CollectionState {
  filters: Filter[];
  sortStates: SortState[];
  pageSize: number;
}

type CollectionAction =
  | {
      type: "ADD_FILTER";
      field: string;
      operator: string;
      value: unknown;
      caseSensitive?: boolean;
    }
  | { type: "SET_FILTERS"; filters: Filter[] }
  | { type: "REMOVE_FILTER"; field: string }
  | { type: "CLEAR_FILTERS" }
  | { type: "SET_SORT"; field: string; direction?: "Asc" | "Desc" }
  | { type: "CLEAR_SORT" }
  | { type: "SET_PAGE_SIZE"; pageSize: number };

function collectionReducer(state: CollectionState, action: CollectionAction): CollectionState {
  switch (action.type) {
    case "ADD_FILTER": {
      const { field, operator, value, caseSensitive } = action;
      const newFilter: Filter = {
        field,
        operator: operator as Filter["operator"],
        value,
        caseSensitive,
      };
      const existing = state.filters.findIndex((f) => f.field === field);
      const filters =
        existing >= 0
          ? state.filters.map((f, i) => (i === existing ? newFilter : f))
          : [...state.filters, newFilter];
      return { ...state, filters };
    }
    case "SET_FILTERS":
      return { ...state, filters: action.filters };
    case "REMOVE_FILTER":
      return {
        ...state,
        filters: state.filters.filter((f) => f.field !== action.field),
      };
    case "CLEAR_FILTERS":
      return { ...state, filters: [] };
    case "SET_SORT": {
      const { field, direction } = action;
      if (direction === undefined) {
        return {
          ...state,
          sortStates: state.sortStates.filter((s) => s.field !== field),
        };
      }
      const filtered = state.sortStates.filter((s) => s.field !== field);
      return {
        ...state,
        sortStates: [...filtered, { field, direction }],
      };
    }
    case "CLEAR_SORT":
      return { ...state, sortStates: [] };
    case "SET_PAGE_SIZE":
      return { ...state, pageSize: action.pageSize };
    default:
      return state;
  }
}

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
  const { params = {}, persistence } = options;
  const { initialFilters = [], initialSort = [], pageSize: initialPageSize = 20 } = params;

  // ---------------------------------------------------------------------------
  // State (reducer-based)
  // ---------------------------------------------------------------------------
  const [state, dispatch] = useReducer(collectionReducer, undefined, () => {
    const snapshot = persistence?.read();
    return {
      filters: snapshot?.filters ?? initialFilters,
      sortStates: snapshot?.sort ?? initialSort,
      pageSize: snapshot?.pageSize ?? initialPageSize,
    };
  });

  const { filters, sortStates, pageSize } = state;

  // ---------------------------------------------------------------------------
  // Persistence write-back (skip initial render)
  // ---------------------------------------------------------------------------
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    persistence?.write({
      filters: state.filters,
      sort: state.sortStates,
      pageSize: state.pageSize,
    });
  }, [state.filters, state.sortStates, state.pageSize, persistence]);

  // ---------------------------------------------------------------------------
  // Cursor pagination (pageSize owned by reducer, passed in)
  // ---------------------------------------------------------------------------
  const {
    paginationVariables,
    goToNextPage,
    goToPrevPage,
    resetPage,
    goToFirstPage,
    goToLastPage,
    getHasPrevPage,
    getHasNextPage,
    resetCount,
  } = useCursorPagination(pageSize);

  // ---------------------------------------------------------------------------
  // Control actions (dispatch user actions + reset pagination)
  // ---------------------------------------------------------------------------
  const addFilter = useCallback(
    (
      field: string,
      operator: FilterOperator,
      value: unknown,
      filterOptions?: { caseSensitive?: boolean },
    ) => {
      dispatch({
        type: "ADD_FILTER",
        field,
        operator,
        value,
        caseSensitive: filterOptions?.caseSensitive,
      });
      resetPage();
    },
    [resetPage],
  );

  const setFilters = useCallback(
    (newFilters: Filter[]) => {
      dispatch({ type: "SET_FILTERS", filters: newFilters });
      resetPage();
    },
    [resetPage],
  );

  const removeFilter = useCallback(
    (field: string) => {
      dispatch({ type: "REMOVE_FILTER", field });
      resetPage();
    },
    [resetPage],
  );

  const clearFilters = useCallback(() => {
    dispatch({ type: "CLEAR_FILTERS" });
    resetPage();
  }, [resetPage]);

  const setSort = useCallback(
    (field: string, direction?: "Asc" | "Desc") => {
      dispatch({ type: "SET_SORT", field, direction });
      resetPage();
    },
    [resetPage],
  );

  const clearSort = useCallback(() => {
    dispatch({ type: "CLEAR_SORT" });
    resetPage();
  }, [resetPage]);

  const setPageSize = useCallback(
    (size: number) => {
      dispatch({ type: "SET_PAGE_SIZE", pageSize: size });
      resetPage();
    },
    [resetPage],
  );

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
