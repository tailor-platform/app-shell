import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createLineItemsDocumentStore } from "./document/store";
import { createLineItemsEditing, LINE_ITEMS_EDITING } from "./editing";
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
  const [store] = useState(() =>
    createLineItemsDocumentStore<T>({ ...options, lines: options.defaultLines }),
  );
  const [editing] = useState(() => createLineItemsEditing(store, options.columns));
  if ((options.idKey ?? "id") !== store.idKey) throw new Error("Remount LineItems to change idKey");
  // Validate without changing configuration or drafts from an abandoned render.
  editing.assertColumns(options.columns);
  const lines = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const isSaveLocked = useSyncExternalStore(
    editing.subscribe,
    editing.isSaveLocked,
    editing.isSaveLocked,
  );
  // Retained commands must not observe a movement policy from an abandoned render.
  useLayoutEffect(() => {
    committedOrderer.current = orderer;
  }, [orderer]);
  // Suspense disconnects layout effects without destroying the document or its save lock.
  useEffect(() => {
    editing.activate();
    return editing.deactivate;
  }, [editing]);
  // Stable permission predicates may read external state; check each committed render.
  useLayoutEffect(() => {
    editing.reconcileColumns(options.columns);
  });
  const reorderLine = useCallback(
    (lineKey: string, afterLineKey: string | null) => {
      editing.assertCanMutate();
      if (!committedOrderer.current) throw new Error("Manual reordering is disabled");
      store.reorderLine(lineKey, afterLineKey);
    },
    [store, editing],
  );
  return {
    [LINE_ITEMS_EDITING]: editing,
    columns: options.columns,
    lines,
    orderer,
    isDirty: store.isDirty(options.columns),
    getChanges: () => store.getChanges(options.columns),
    isSaveLocked,
    commitChanges: editing.commitChanges,
    replaceLines: editing.replaceLines,
    finishSave: editing.finishSave,
    getLineKey: store.getLineKey,
    updateField: editing.updateField,
    addLine: editing.addLine,
    removeLine: editing.removeLine,
    reorderLine,
    revert: editing.revert,
  };
}
