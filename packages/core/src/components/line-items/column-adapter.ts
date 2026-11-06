import type { ReactNode } from "react";
import {
  createValueRenderer,
  getDefaultAlignment,
} from "@/components/internals/table-core/cell-renderers";
import type { LineItemsEditorAdapter } from "./editor-adapter";
import { resolveLineItemsEditor } from "./editors";
import type { LineItemsColumn } from "./types";

export type LineItemsColumnAdapter<TRow extends Record<string, unknown>> = {
  readonly align: "left" | "center" | "right";
  readonly renderDisplay: (row: TRow) => ReactNode;
  readonly editor?: LineItemsEditorAdapter;
};

/** Resolve presentation independently of the explicitly selected property editor. */
export function resolveLineItemsColumn<TRow extends Record<string, unknown>>(
  column: LineItemsColumn<TRow>,
  timeZone: string,
): LineItemsColumnAdapter<TRow> {
  const renderValue = column.render
    ? undefined
    : createValueRenderer(column, timeZone, {
        get linkAsText() {
          return !!column.edit;
        },
      });
  return {
    align: column.align ?? getDefaultAlignment(column.type),
    renderDisplay: (row) =>
      column.render
        ? column.render(row)
        : renderValue!(
            column.accessorKey !== undefined ? row[column.accessorKey] : column.accessor?.(row),
            row,
          ),
    // Formatter caching must not freeze a replaced editor or in-place option changes.
    get editor() {
      return column.edit && resolveLineItemsEditor(column.edit.editor);
    },
  };
}
