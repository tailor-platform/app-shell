import { useCallback, useMemo, useRef, useState } from "react";

export function useDataTableSelection<TRow extends Record<string, unknown>>({
  rows,
  getRowId,
  onSelectionChange,
}: {
  rows: TRow[];
  getRowId: (row: TRow) => string | null;
  onSelectionChange?: (ids: string[]) => void;
}) {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const selectedRowIdsRef = useRef(selectedRowIds);
  selectedRowIdsRef.current = selectedRowIds;

  const isRowSelected = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      if (id === null) return false;
      return selectedRowIds.has(id);
    },
    [selectedRowIds, getRowId],
  );

  const toggleRowSelection = onSelectionChange
    ? (row: TRow) => {
        const id = getRowId(row);
        if (id === null) return;
        const next = new Set(selectedRowIdsRef.current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        selectedRowIdsRef.current = next;
        setSelectedRowIds(next);
        onSelectionChange([...next]);
      }
    : undefined;

  const selectAllRows = onSelectionChange
    ? () => {
        const allIds = new Set(
          rows.map((row) => getRowId(row)).filter((id): id is string => id !== null),
        );
        selectedRowIdsRef.current = allIds;
        setSelectedRowIds(allIds);
        onSelectionChange([...allIds]);
      }
    : undefined;

  const clearSelection = onSelectionChange
    ? () => {
        const empty = new Set<string>();
        selectedRowIdsRef.current = empty;
        setSelectedRowIds(empty);
        onSelectionChange([]);
      }
    : undefined;

  const selectedIds = useMemo(() => [...selectedRowIds], [selectedRowIds]);

  const selectableCount = rows.filter((row) => getRowId(row) !== null).length;
  const isAllSelected =
    selectableCount > 0 &&
    rows.every((row) => {
      const id = getRowId(row);
      return id === null || selectedRowIds.has(id);
    });
  const isIndeterminate = selectedRowIds.size > 0 && !isAllSelected;

  return {
    selectedIds,
    isRowSelected,
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    isAllSelected,
    isIndeterminate,
  };
}
