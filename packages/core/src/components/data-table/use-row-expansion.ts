import { useCallback, useMemo, useRef, useState } from "react";
import type { RowExpansionOptions } from "./types";

export function useRowExpansion<TRow extends Record<string, unknown>>(
  rowExpansion: RowExpansionOptions<TRow> | undefined,
  getRowId: (row: TRow) => string | null,
) {
  // Keyed by the same `getRowId` as selection — there is one row-id convention.
  const [uncontrolledExpandedIds, setUncontrolledExpandedIds] = useState<Set<string>>(new Set());

  // Controlled when the caller passes `expandedIds`; internal state is then never written.
  const controlledExpandedIds = rowExpansion?.expandedIds;
  const isExpansionControlled = controlledExpandedIds !== undefined;

  const expandedRowIds = useMemo(
    () => (isExpansionControlled ? new Set(controlledExpandedIds) : uncontrolledExpandedIds),
    [isExpansionControlled, controlledExpandedIds, uncontrolledExpandedIds],
  );

  const isRowExpanded = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      return id !== null && expandedRowIds.has(id);
    },
    [expandedRowIds, getRowId],
  );

  // Refs keep `toggleRowExpansion` / `collapseAllRows` identity-stable: the
  // callback is usually an inline arrow and `expandedRowIds` is a fresh Set on
  // every change, so depending on either directly re-fired the documented
  // "collapse on page change" effect and shut the row the user just opened.
  const onExpandedChangeRef = useRef(rowExpansion?.onChange);
  onExpandedChangeRef.current = rowExpansion?.onChange;
  const expandedRowIdsRef = useRef(expandedRowIds);
  expandedRowIdsRef.current = expandedRowIds;

  const toggleRowExpansionImpl = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      if (id === null) return;
      // Computed outside the updater, as in `toggleRowSelection`. Uncontrolled
      // composes correctly because the ref is written eagerly below; controlled
      // mode still reads the caller's prop, so repeated toggles before their
      // state commits share a base — see the `expandedIds` TSDoc.
      const next = new Set(expandedRowIdsRef.current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // Controlled callers own the state; internal state is never written then,
      // and the ref must keep mirroring their prop rather than our guess.
      if (!isExpansionControlled) {
        expandedRowIdsRef.current = next;
        setUncontrolledExpandedIds(next);
      }
      onExpandedChangeRef.current?.([...next]);
    },
    [getRowId, isExpansionControlled],
  );

  const collapseAllRowsImpl = useCallback(() => {
    // Nothing open — skip the state write and the callback entirely, so calling
    // this from an effect can't drive an endless render loop.
    if (expandedRowIdsRef.current.size === 0) return;
    if (!isExpansionControlled) {
      const empty = new Set<string>();
      expandedRowIdsRef.current = empty;
      setUncontrolledExpandedIds(empty);
    }
    onExpandedChangeRef.current?.([]);
  }, [isExpansionControlled]);

  const toggleRowExpansion = rowExpansion ? toggleRowExpansionImpl : undefined;
  const collapseAllRows = rowExpansion ? collapseAllRowsImpl : undefined;

  const expandedIdsList = useMemo(() => [...expandedRowIds], [expandedRowIds]);

  return {
    expandedIds: expandedIdsList,
    isRowExpanded,
    toggleRowExpansion,
    collapseAllRows,
  };
}
