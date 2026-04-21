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
export interface DataTableContextValue<TRow extends Record<string, unknown>, TRowId = string> {
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
  nextPage: (token: string) => void;
  prevPage: (token: string) => void;
  hasPrevPage: boolean;
  hasNextPage: boolean;

  // Column management
  columns: Column<TRow>[];
  visibleColumns: Column<TRow>[];
  toggleColumn: (fieldOrId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  isColumnVisible: (fieldOrId: string) => boolean;

  // Row key identifier
  rowKey: string;

  // Row interaction
  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];

  // Row operations
  updateRow: (rowId: TRowId, fields: Partial<TRow>) => { rollback: () => void };
  deleteRow: (rowId: TRowId) => {
    rollback: () => void;
    deletedRow: TRow | undefined;
  };
  insertRow: (row: TRow) => { rollback: () => void };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTableContext = createContext<DataTableContextValue<any, any> | null>(null);

export { DataTableContext };

/**
 * Hook to access the full DataTable state (rows, columns, sorting, pagination,
 * column visibility, and row operations) from the nearest `DataTable.Root`.
 *
 * @throws Error if used outside of `DataTable.Root`.
 */
export function useDataTableContext<
  TRow extends Record<string, unknown>,
  TRowId = string,
>(): DataTableContextValue<TRow, TRowId> {
  const ctx = useContext(DataTableContext);
  if (!ctx) {
    throw new Error("useDataTableContext must be used within <DataTable.Root>");
  }
  return ctx as DataTableContextValue<TRow, TRowId>;
}
