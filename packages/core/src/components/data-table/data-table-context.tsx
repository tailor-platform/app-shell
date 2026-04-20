import { createContext, useContext } from "react";
import type { UseDataTableReturn } from "./types";

/**
 * Context value provided by `DataTable.Root`.
 */
export type DataTableContextValue<TRow extends Record<string, unknown>, TRowId = string> = Omit<
  UseDataTableReturn<TRow, TRowId>,
  "control"
>;

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
