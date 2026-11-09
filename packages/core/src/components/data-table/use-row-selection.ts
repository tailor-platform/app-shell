import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RowSelectionOptions } from "./types";

export function useRowSelection<TRow extends Record<string, unknown>>(
  rows: TRow[],
  rowSelection: RowSelectionOptions | undefined,
  onSelectionChange: ((ids: string[]) => void) | undefined,
  getRowId: (row: TRow) => string | null,
) {
  const selectionEnabled = rowSelection !== undefined || !!onSelectionChange;
  const controlledSelectedIds = rowSelection?.selectedIds;
  const selectionOnChange = rowSelection?.onChange ?? onSelectionChange;
  const [uncontrolledSelection, setSelection] = useState<Set<string>>(
    () => new Set(rowSelection?.defaultSelectedIds),
  );
  // Keep uncontrolled commands composable before React commits their state.
  const selectionRef = useRef(uncontrolledSelection);
  selectionRef.current = uncontrolledSelection;
  const selectionOwnerRef = useRef({
    selectedIds: controlledSelectedIds,
    onChange: selectionOnChange,
  });
  const selection = useMemo(
    () =>
      controlledSelectedIds !== undefined ? new Set(controlledSelectedIds) : uncontrolledSelection,
    [controlledSelectedIds, uncontrolledSelection],
  );

  const isRowSelected = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      return id !== null && selection.has(id);
    },
    [selection, getRowId],
  );

  const currentSelection = () => {
    const ids = selectionOwnerRef.current.selectedIds;
    return new Set(ids ?? selectionRef.current);
  };

  // Notify outside the updater so StrictMode cannot invoke the callback twice.
  const commitSelection = (next: Set<string>) => {
    if (selectionOwnerRef.current.selectedIds === undefined) {
      selectionRef.current = next;
      setSelection(next);
    }
    selectionOwnerRef.current.onChange?.([...next]);
  };

  const toggleRowSelection = selectionEnabled
    ? (row: TRow) => {
        const id = getRowId(row);
        if (id === null) return;
        const next = currentSelection();
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        commitSelection(next);
      }
    : undefined;

  // Page-scoped on purpose: rows selected on other pages are left alone, so the
  // header checkbox never silently drops part of a cross-page selection.
  const selectAllRows = selectionEnabled
    ? () => {
        const next = currentSelection();
        for (const row of rows) {
          const id = getRowId(row);
          if (id !== null) next.add(id);
        }
        commitSelection(next);
      }
    : undefined;

  const deselectAllRows = selectionEnabled
    ? () => {
        const next = currentSelection();
        for (const row of rows) {
          const id = getRowId(row);
          if (id !== null) next.delete(id);
        }
        commitSelection(next);
      }
    : undefined;

  // Clearing an empty selection must not fire another change notification.
  const clearSelection = selectionEnabled
    ? () => {
        if (currentSelection().size === 0) return;
        commitSelection(new Set());
      }
    : undefined;

  // Id of the selection action whose request is in flight. It lives here rather
  // than in the footer bar so it survives the bar unmounting and remounting
  // (the selection emptying and refilling mid-request), and so a request handed
  // back later — from a confirm dialog, via `run` — is tracked the same way.
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const pendingActionIdRef = useRef(pendingActionId);
  pendingActionIdRef.current = pendingActionId;

  const runSelectionAction = selectionEnabled
    ? (action: { id: string }, request: PromiseLike<unknown>) => {
        // One request at a time: the bar disables its actions while one runs,
        // so a second call here only comes from app code racing itself.
        if (pendingActionIdRef.current !== null) return;
        pendingActionIdRef.current = action.id;
        setPendingActionId(action.id);
        const settle = () => {
          pendingActionIdRef.current = null;
          setPendingActionId(null);
        };
        request.then(settle, (reason: unknown) => {
          // Keep the selection so the action can be retried. Report rather
          // than rethrow: a rethrow from this chain would surface as an
          // unhandled rejection even when the app already handled the error.
          settle();
          console.error(`[DataTable] Selection action "${action.id}" failed:`, reason);
        });
      }
    : undefined;

  const selectedIds = useMemo(() => [...selection], [selection]);

  // Retained selection helpers must consult the current committed owner.
  useLayoutEffect(() => {
    selectionOwnerRef.current = { selectedIds: controlledSelectedIds, onChange: selectionOnChange };
  }, [controlledSelectedIds, selectionOnChange]);

  const selectableCount = rows.filter((r) => getRowId(r) !== null).length;
  const isAllSelected =
    selectableCount > 0 &&
    rows.every((r) => {
      const id = getRowId(r);
      // Rows without id are not selectable — skip them in the check
      return id === null || selection.has(id);
    });
  const isIndeterminate = selection.size > 0 && !isAllSelected;

  return {
    selectedIds,
    isRowSelected,
    toggleRowSelection,
    selectAllRows,
    deselectAllRows,
    clearSelection,
    pendingActionId,
    runSelectionAction,
    isAllSelected,
    isIndeterminate,
  };
}
