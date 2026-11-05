import { parseDateValue } from "@/components/internals/table-core/date-values";
import type { LineItemsColumn } from "./types";

/** Validate display identities and one editor owner per property, independently of row state. */
export function compileLineItemsColumns<T extends Record<string, unknown>>(
  columns: readonly LineItemsColumn<T>[],
): ReadonlySet<keyof T & string> {
  const ids = new Set<string>();
  const properties = new Set<keyof T & string>();
  const editors = new Set<string>();
  for (const column of columns) {
    const id = column.id ?? column.accessorKey;
    if (typeof id !== "string" || id === "" || ids.has(id))
      throw new Error("LineItems column IDs must be non-empty and unique");
    ids.add(id);
    if (column.accessorKey !== undefined) properties.add(column.accessorKey);
    const edit = column.edit;
    if (edit === undefined) continue;
    if (column.accessorKey === undefined)
      throw new Error("Only accessorKey properties may have cell editors");
    if (editors.has(column.accessorKey))
      throw new Error(`Property "${column.accessorKey}" has multiple edit owners`);
    editors.add(column.accessorKey);
    if (
      !edit ||
      !["text", "number", "boolean", "date", "combobox", "custom"].includes(edit.editorType)
    )
      throw new Error("Unsupported LineItems cell editor");
    if (edit.editorType === "custom" && typeof edit.renderEditor !== "function")
      throw new Error("Custom editors require renderEditor");
    if (edit.editorType === "date") parseDateValue(null, edit);
    if (edit.editorType === "combobox") {
      if (edit.fetcher === undefined && !Array.isArray(edit.options))
        throw new Error("Choice editors require options or a fetcher");
      if (
        edit.fetcher !== undefined &&
        (edit.options !== undefined || typeof edit.getOptionLabel !== "function")
      )
        throw new Error("Remote choices require getOptionLabel and cannot also define options");
    }
  }
  return properties;
}
