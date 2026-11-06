import type { ReactNode } from "react";
import { resolveDataTableColumn } from "./column-adapter";
import { getCellValue } from "./cell-values";
import type { Column } from "./types";

export { getCellValue } from "./cell-values";

/** Build once per column/timezone so the display adapter retains formatter caches. */
export function createTypedCellRenderer<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
  timeZone: string,
): (row: TRow) => ReactNode {
  const adapter = resolveDataTableColumn(col, timeZone);
  return (row) => adapter.renderValue(getCellValue(row, col), row);
}

/** Compatibility entrypoint; label and editing-display policies belong to the adapter. */
export function renderTypedValue<TRow extends Record<string, unknown>>(
  row: TRow,
  col: Column<TRow>,
  value: unknown,
  options?: { linkAsText?: boolean; timeZone?: string },
): ReactNode {
  return resolveDataTableColumn(col, options?.timeZone).renderValue(value, row, options);
}
