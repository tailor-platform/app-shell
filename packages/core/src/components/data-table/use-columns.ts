import { useMemo } from "react";
import { useColumnLayout } from "@/components/internals/table-core/use-column-state";
import { columnKeyAt } from "./column-layout";
import type { Column } from "./types";

/** DataTable retains its legacy ID/label/index resolution and visibility API. */
export function useColumns<TRow extends Record<string, unknown>>(
  allColumns: Column<TRow>[],
  tableId: string | undefined,
) {
  const meta = useMemo(
    () =>
      allColumns.map((column, index) => ({
        id: columnKeyAt(column, index),
        label: column.label,
        pin: column.pin,
      })),
    [allColumns],
  );
  const byId = useMemo(
    () => new Map(allColumns.map((column, index) => [columnKeyAt(column, index), column])),
    [allColumns],
  );
  const { visibleIds, ...layout } = useColumnLayout(meta, { tableId, namespace: "data-table" });
  const visibleColumns = useMemo(
    () =>
      visibleIds
        .map((id) => byId.get(id))
        .filter((column): column is Column<TRow> => column !== undefined),
    [visibleIds, byId],
  );
  return { ...layout, visibleColumns };
}
