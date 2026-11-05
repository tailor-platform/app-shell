import type { LineItemsColumn } from "./types";

/** Resolve document property ownership independently of display column identities. */
export function compileLineItemsColumns<T extends Record<string, unknown>>(
  columns: readonly LineItemsColumn<T>[],
): ReadonlySet<keyof T & string> {
  const ids = new Set<string>();
  const properties = new Set<keyof T & string>();
  for (const column of columns) {
    const id = column.id ?? column.accessorKey;
    if (typeof id !== "string" || id === "" || ids.has(id))
      throw new Error("LineItems column IDs must be non-empty and unique");
    if ("edit" in column && column.edit !== undefined)
      throw new Error("This LineItems slice is readonly; cell editors are not supported yet");
    ids.add(id);
    if (column.accessorKey !== undefined) properties.add(column.accessorKey);
  }
  return properties;
}
