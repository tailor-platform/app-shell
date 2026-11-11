import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  checkState,
  readValue,
  resolveSelectionStrategy,
  toggleChecked,
  writeValue,
  type TreeIndex,
  type TreeNode,
} from "@/lib/tree/model";
import type { RowSelectionOptions } from "./types";

const NOT_CHECKED = { checked: false, indeterminate: false };

export function useRowSelection<TRow extends Record<string, unknown>>(
  rows: TRow[],
  rowSelection: RowSelectionOptions | undefined,
  onSelectionChange: ((ids: string[]) => void) | undefined,
  getRowId: (row: TRow) => string | null,
  /** With `subRows`: the tree built from the page's rows. Selection then propagates through it. */
  treeIndex: TreeIndex<TRow> | null = null,
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

  // With sub-rows, the selected ids are a value in the tree's sense: read it
  // into ticked keys, change those, and write the ids back, so propagation and
  // the value strategy work exactly as on `Tree`. Ids that aren't on this page
  // pass through untouched.
  const { propagation, valueStrategy: strategy } = resolveSelectionStrategy(
    rowSelection?.selectionStrategy,
  );
  const treeState = useMemo(
    () => (treeIndex ? readValue(treeIndex, [...selection], propagation) : null),
    [treeIndex, selection, propagation],
  );

  const nodeOf = useCallback(
    (row: TRow): TreeNode<TRow> | undefined => {
      const id = getRowId(row);
      return id === null ? undefined : treeIndex?.byKey.get(id)?.[0];
    },
    [treeIndex, getRowId],
  );

  const getRowCheckState = useCallback(
    (row: TRow) => {
      const node = nodeOf(row);
      if (!node || !treeState) return NOT_CHECKED;
      return checkState(node, treeState.checked, propagation);
    },
    [nodeOf, treeState, propagation],
  );

  const isRowSelected = useCallback(
    (row: TRow) => {
      if (treeIndex) return getRowCheckState(row).checked;
      const id = getRowId(row);
      return id !== null && selection.has(id);
    },
    [treeIndex, getRowCheckState, selection, getRowId],
  );

  /** Applies a change to the ticked keys and commits the ids it writes. */
  const commitTree = (change: (checked: ReadonlySet<string>) => ReadonlySet<string>) => {
    if (!treeIndex) return;
    const state = readValue(treeIndex, [...currentSelection()], propagation);
    const checked = change(state.checked);
    if (checked === state.checked) return;
    const listed = writeValue(
      treeIndex,
      { checked, unknown: state.unknown },
      propagation,
      strategy,
    );
    commitSelection(new Set([...listed.map((node) => node.key), ...state.unknown]));
  };

  /** The rows on this page that select-all ticks: every leaf with "full", every row otherwise. */
  const pageTargets = (): TreeNode<TRow>[] =>
    (treeIndex?.nodes ?? []).filter(
      (node) => !node.disabled && (propagation !== "full" || node.isLeaf),
    );

  const setPageTicked = (next: boolean) =>
    commitTree((checked) => {
      const updated = new Set(checked);
      for (const node of pageTargets()) {
        if (next) updated.add(node.key);
        else updated.delete(node.key);
      }
      return updated;
    });

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
        if (treeIndex) {
          const node = nodeOf(row);
          if (!node || node.disabled) return;
          commitTree((checked) => {
            const next = !checkState(node, checked, propagation).checked;
            return toggleChecked(node, next, checked, propagation);
          });
          return;
        }
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
        if (treeIndex) {
          setPageTicked(true);
          return;
        }
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
        if (treeIndex) {
          setPageTicked(false);
          return;
        }
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

  let isAllSelected: boolean;
  if (treeIndex && treeState) {
    const targets = pageTargets();
    isAllSelected = targets.length > 0 && targets.every((node) => treeState.checked.has(node.key));
  } else {
    const selectableCount = rows.filter((r) => getRowId(r) !== null).length;
    isAllSelected =
      selectableCount > 0 &&
      rows.every((r) => {
        const id = getRowId(r);
        // Rows without id are not selectable — skip them in the check
        return id === null || selection.has(id);
      });
  }
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
    getRowCheckState: treeIndex ? getRowCheckState : undefined,
  };
}
