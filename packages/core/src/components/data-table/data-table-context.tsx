import { createContext, useContext } from "react";
import type { Column, RowAction } from "./types";
import type { PageInfo, SortState } from "@/types/collection";

/**
 * Context value provided by `DataTable.Root`.
 *
 * `control` is intentionally excluded from this context: collection control
 * (filters, sort, and pagination) is managed by `CollectionControlProvider`
 * via a separate context. Keeping them separate means `DataTable.Root` works
 * without any collection control (read-only / static tables), while
 * `CollectionControlProvider` can optionally wrap it when filtering and
 * pagination are needed. This also avoids coupling `DataTableContextValue`
 * to `UseDataTableReturn` — changes to `UseDataTableReturn` require an
 * explicit decision about whether they should appear in the context.
 */
export interface DataTableContextValue<TRow extends Record<string, unknown>> {
  // Data
  rows: TRow[];
  loading: boolean;
  error: Error | null;
  sortStates: SortState[];
  onSort?: (field: string, direction?: "Asc" | "Desc") => void;

  // Pagination (derived from data)
  pageInfo: PageInfo;
  total: number | null;
  totalPages: number | null;
  nextPage: (cursor: string) => void;
  prevPage: (cursor?: string) => void;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  /**
   * The resolved page size from the collection control. `0` when no control is
   * configured. Used to render the correct number of skeleton / ghost rows.
   */
  pageSize: number;

  // Column management
  columns: Column<TRow>[];
  visibleColumns: Column<TRow>[];
  toggleColumn: (fieldOrId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  isColumnVisible: (fieldOrId: string) => boolean;

  // Row interaction
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];

  // Row selection
  // toggleRowSelection / selectAllRows / clearSelection are undefined when onSelectionChange is not provided
  selectedIds: string[];
  isRowSelected: (row: TRow) => boolean;
  toggleRowSelection?: (row: TRow) => void;
  /**
   * Selects all rows on the **current page** only. Cross-page selection is not supported.
   * Undefined when `onSelectionChange` is not provided.
   */
  selectAllRows?: () => void;
  clearSelection?: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

export { DataTableContext };

/**
 * Hook to access the full DataTable state (rows, columns, sorting, pagination,
 * column visibility, and row operations) from the nearest `DataTable.Root`.
 *
 * This hook is intentionally part of the public API to support **custom
 * sub-components** rendered inside `DataTable.Root`. Use it when the built-in
 * `DataTable.*` sub-components (Table, Toolbar, Pagination, etc.) are not
 * sufficient and you need to build your own compound component that reads from
 * or writes to the same DataTable context — for example, a column-visibility
 * toggle panel or a custom row-action toolbar.
 *
 * For most use cases, prefer passing values from `useDataTable()` as props
 * rather than reaching into the context directly.
 *
 * @throws Error if used outside of `DataTable.Root`.
 */
export function useDataTableContext<
  TRow extends Record<string, unknown>,
>(): DataTableContextValue<TRow> {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("useDataTableContext must be used within <DataTable.Root>");
  }
  return ctx as DataTableContextValue<TRow>;
}
