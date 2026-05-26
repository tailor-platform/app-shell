import { useEffect } from "react";
import type {
  CollectionSnapshot,
  CollectionStateSynchronizer,
  Filter,
  SortState,
} from "@/types/collection";

// =============================================================================
// State & Action types
// =============================================================================

export type ChangeSource = "init" | "user" | "sync";

export interface CollectionState {
  filters: Filter[];
  sortStates: SortState[];
  pageSize: number;
  source: ChangeSource;
}

export type CollectionAction =
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
  | { type: "SET_PAGE_SIZE"; pageSize: number }
  | { type: "SYNC"; snapshot: CollectionSnapshot | undefined };

// =============================================================================
// Reducer
// =============================================================================

export function collectionReducer(
  state: CollectionState,
  action: CollectionAction,
): CollectionState {
  switch (action.type) {
    case "SYNC": {
      if (!action.snapshot) return state;
      return {
        ...state,
        ...(action.snapshot.filters != null && {
          filters: action.snapshot.filters,
        }),
        ...(action.snapshot.sort != null && {
          sortStates: action.snapshot.sort,
        }),
        ...(action.snapshot.pageSize != null && {
          pageSize: action.snapshot.pageSize,
        }),
        source: "sync",
      };
    }
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
      return { ...state, filters, source: "user" };
    }
    case "SET_FILTERS":
      return { ...state, filters: action.filters, source: "user" };
    case "REMOVE_FILTER":
      return {
        ...state,
        filters: state.filters.filter((f) => f.field !== action.field),
        source: "user",
      };
    case "CLEAR_FILTERS":
      return { ...state, filters: [], source: "user" };
    case "SET_SORT": {
      const { field, direction } = action;
      if (direction === undefined) {
        return {
          ...state,
          sortStates: state.sortStates.filter((s) => s.field !== field),
          source: "user",
        };
      }
      const filtered = state.sortStates.filter((s) => s.field !== field);
      return {
        ...state,
        sortStates: [...filtered, { field, direction }],
        source: "user",
      };
    }
    case "CLEAR_SORT":
      return { ...state, sortStates: [], source: "user" };
    case "SET_PAGE_SIZE":
      return { ...state, pageSize: action.pageSize, source: "user" };
    default:
      return state;
  }
}

// =============================================================================
// Synchronizer Bridge Hook
// =============================================================================

/**
 * Connects a synchronizer to the collection reducer state.
 *
 * - Subscribes to external changes and dispatches `SYNC` actions.
 * - Writes state back to the synchronizer when changes originate from user actions.
 */
export function useSynchronizerBridge(
  synchronizer: CollectionStateSynchronizer | undefined,
  state: CollectionState,
  dispatch: React.Dispatch<CollectionAction>,
): void {
  // Subscribe: external changes → dispatch
  useEffect(() => {
    if (!synchronizer) return;
    return synchronizer.subscribe((snapshot) => {
      dispatch({ type: "SYNC", snapshot });
    });
  }, [synchronizer, dispatch]);

  // Write-back: only when source is "user"
  useEffect(() => {
    if (state.source !== "user") return;
    synchronizer?.write({
      filters: state.filters,
      sort: state.sortStates,
      pageSize: state.pageSize,
    });
  }, [state.filters, state.sortStates, state.pageSize, state.source, synchronizer]);
}
