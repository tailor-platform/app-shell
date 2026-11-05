import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createLineItemsDocument } from "./document";
import type { UseLineItemsOptions, UseLineItemsReturn } from "./types";

/** Owns one document; changing the document identity requires remounting the hook's owner. */
export function useLineItems<T extends Record<string, unknown>>(
  options: UseLineItemsOptions<T>,
): UseLineItemsReturn<T> {
  if ("lines" in options || "onLinesChange" in options)
    throw new Error("useLineItems owns its rows; use defaultLines, not controlled lines");
  if (options.orderer !== undefined && typeof options.orderer !== "boolean")
    throw new Error("LineItems orderer must be a boolean");
  const orderer = options.orderer ?? true;
  const committedOrderer = useRef(orderer);
  const [document] = useState(() =>
    createLineItemsDocument<T>({
      columns: options.columns,
      lines: options.defaultLines,
      idKey: options.idKey,
    }),
  );
  if ((options.idKey ?? "id") !== document.idKey)
    throw new Error("Remount LineItems to change idKey");
  // This checks ownership only; abandoned renders cannot modify the document.
  document.setColumns(options.columns);
  const lines = useSyncExternalStore(document.subscribe, document.getRows, document.getRows);
  // Retained commands must not observe a movement policy from an abandoned render.
  useLayoutEffect(() => {
    committedOrderer.current = orderer;
  }, [orderer]);
  const reorderLine = useCallback(
    (lineKey: string, afterLineKey: string | null) => {
      if (!committedOrderer.current) throw new Error("Manual reordering is disabled");
      document.reorderLine(lineKey, afterLineKey);
    },
    [document],
  );
  return {
    columns: options.columns,
    lines,
    orderer,
    isDirty: document.isDirty(),
    getLineKey: document.getLineKey,
    updateField: document.updateField,
    addLine: document.addLine,
    removeLine: document.removeLine,
    reorderLine,
    revert: document.revert,
  };
}
