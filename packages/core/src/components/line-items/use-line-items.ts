import { useState } from "react";
import type { UseLineItemsOptions, UseLineItemsReturn } from "./types";

/** Owns the initial readonly rows; column definitions remain reactive. */
export function useLineItems<T extends Record<string, unknown>>(
  options: UseLineItemsOptions<T>,
): UseLineItemsReturn<T> {
  if ("lines" in options || "onLinesChange" in options)
    throw new Error("useLineItems owns its rows; use defaultLines, not controlled lines");
  const columnIds = new Set<string>();
  for (const column of options.columns) {
    const id = column.id ?? column.accessorKey;
    if (typeof id !== "string" || id === "" || columnIds.has(id))
      throw new Error("LineItems column IDs must be non-empty and unique");
    if ("edit" in column && column.edit !== undefined)
      throw new Error("This LineItems slice is readonly; cell editors are not supported yet");
    columnIds.add(id);
  }
  const [document] = useState(() => {
    const keys = new WeakMap<T, string>();
    const ids = new Set<string>();
    const prefix = crypto.randomUUID();
    const idKey = options.idKey ?? "id";
    const lines = Object.freeze(
      (options.defaultLines ?? []).map((row, index) => {
        const id = row[idKey];
        if (
          id != null &&
          ((typeof id !== "string" && typeof id !== "number") ||
            id === "" ||
            (typeof id === "number" && !Number.isFinite(id)))
        )
          throw new Error("Line IDs must be non-empty strings or finite numbers");
        const key = id == null ? `line:${prefix}:${index + 1}` : String(id);
        if (ids.has(key)) throw new Error("Line IDs must be unique");
        ids.add(key);
        const line = Object.freeze({ ...row });
        keys.set(line, key);
        return line;
      }),
    );
    return {
      lines,
      getLineKey: (row: T) => {
        const key = keys.get(row);
        if (key === undefined) throw new Error("The line does not belong to this document");
        return key;
      },
    };
  });
  return { columns: options.columns, ...document };
}
