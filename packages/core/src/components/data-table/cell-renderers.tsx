import type { ReactNode } from "react";
import { createValueRenderer } from "@/components/internals/table-core";
import { optionLabel, resolveBadgeOptions } from "./cell-values";
import type { Column } from "./types";

/**
 * Read the raw cell value for a column. Used by the built-in `type`
 * renderers and by `truncate`'s tooltip so they share one precedence
 * rule: explicit `accessor` wins, otherwise fall back to `row[col.id]`
 * when `id` is set.
 *
 * @internal
 */
export function getCellValue<TRow extends Record<string, unknown>>(
  row: TRow,
  col: Column<TRow>,
): unknown {
  if (col.accessor) return col.accessor(row);
  if (col.id) return row[col.id];
  return undefined;
}

/**
 * Create a column renderer that reuses date formatters across rows.
 * Callers should prefer `col.render` when it is defined.
 *
 * @internal
 */
export function createTypedCellRenderer<TRow extends Record<string, unknown>>(
  col: Column<TRow>,
  timeZone: string,
): (row: TRow) => ReactNode {
  if (col.type === "date") {
    const renderDate = createValueRenderer(col, timeZone);
    return (row) => renderDate(getCellValue(row, col), row);
  }
  return (row) => renderTypedValue(row, col, getCellValue(row, col));
}

/**
 * Render the consumer's current value with the column's built-in renderer.
 * Editable cells pass `linkAsText` because an editable link is an input,
 * not a navigation target.
 *
 * @internal
 */
export function renderTypedValue<TRow extends Record<string, unknown>>(
  row: TRow,
  col: Column<TRow>,
  value: unknown,
  options?: { linkAsText?: boolean; timeZone?: string },
): ReactNode {
  const timeZone =
    options?.timeZone ??
    (col.type === "date" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");
  switch (col.type) {
    case "badge": {
      const choices = col.edit
        ? resolveBadgeOptions(col.edit.options, col.typeOptions, col.filter)
        : undefined;
      return createValueRenderer(col, timeZone, {
        resolveBadgeLabel: choices ? (item) => String(optionLabel(choices, item)) : undefined,
      })(value, row);
    }
    case "link": {
      // An editable link is an input, not navigation; its choice label is resolved here.
      const label = optionLabel(col.edit?.options, value);
      const descriptor = options?.linkAsText ? ({ type: "text" } as const) : col;
      return createValueRenderer(descriptor, timeZone)(label, row);
    }
    case "text":
      return createValueRenderer(col, timeZone)(optionLabel(col.edit?.options, value), row);
    default:
      return createValueRenderer(col, timeZone)(value, row);
  }
}
