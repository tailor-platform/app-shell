import { useCallback, useMemo, useRef, useState } from "react";
import type { RowExpansionOptions } from "./types";

export function useDataTableExpansion<TRow extends Record<string, unknown>>({
  getRowId,
  rowExpansion,
}: {
  getRowId: (row: TRow) => string | null;
  rowExpansion?: RowExpansionOptions<TRow>;
}) {
  const [uncontrolledExpandedIds, setUncontrolledExpandedIds] = useState<Set<string>>(new Set());

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

  const onExpandedChangeRef = useRef(rowExpansion?.onChange);
  onExpandedChangeRef.current = rowExpansion?.onChange;
  const expandedRowIdsRef = useRef(expandedRowIds);
  expandedRowIdsRef.current = expandedRowIds;

  const toggleRowExpansionImpl = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      if (id === null) return;
      const next = new Set(expandedRowIdsRef.current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (!isExpansionControlled) {
        expandedRowIdsRef.current = next;
        setUncontrolledExpandedIds(next);
      }
      onExpandedChangeRef.current?.([...next]);
    },
    [getRowId, isExpansionControlled],
  );

  const collapseAllRowsImpl = useCallback(() => {
    if (expandedRowIdsRef.current.size === 0) return;
    if (!isExpansionControlled) {
      const empty = new Set<string>();
      expandedRowIdsRef.current = empty;
      setUncontrolledExpandedIds(empty);
    }
    onExpandedChangeRef.current?.([]);
  }, [isExpansionControlled]);

  return {
    expandedIds: useMemo(() => [...expandedRowIds], [expandedRowIds]),
    isRowExpanded,
    toggleRowExpansion: rowExpansion ? toggleRowExpansionImpl : undefined,
    collapseAllRows: rowExpansion ? collapseAllRowsImpl : undefined,
  };
}
