import { createContext, useContext } from "react";
import type { PageInfo, SortState } from "@/types/collection";
import type { Column, RowAction, RowOperations } from "./types";

/**
 * Context value provided by `DataTable.Root`.
 */
export interface DataTableContextValue<TRow extends Record<string, unknown>> {
  updateRow: RowOperations<TRow>["updateRow"];
  deleteRow: RowOperations<TRow>["deleteRow"];
  insertRow: RowOperations<TRow>["insertRow"];

  columns: Column<TRow>[];
  rows: TRow[];
  loading: boolean;
  error: Error | null;
  sortStates: SortState[];
  onSort?: (field: string, direction?: "Asc" | "Desc") => void;

  visibleColumns: Column<TRow>[];
  isColumnVisible: (fieldOrId: string) => boolean;
  toggleColumn: (fieldOrId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;

  pageInfo: PageInfo;
  total: number | null;
  totalPages: number | null;
  nextPage: (token: string) => void;
  prevPage: (token: string) => void;
  hasPrevPage: boolean;
  hasNextPage: boolean;

  onClickRow?: (row: TRow) => void;
  rowActions?: RowAction<TRow>[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

export { DataTableContext };

/**
 * Hook to access row operations from the nearest `DataTable.Root`.
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
