import { useCallback, useMemo } from "react";
import { buildTree, flattenVisible, indexTree, type TreeIndex } from "@/lib/tree/model";
import { useTreeExpansion } from "@/lib/tree/use-tree-expansion";
import { columnKeyAt } from "./column-layout";
import type { Column, DataTableTreeRow, RowExpansionOptions, SubRowsOptions } from "./types";

/**
 * The hierarchy column's key: `subRows.column` when it names a column's key
 * (its `id`, else its `label`), else the first column. Resolved from the
 * definition order, never the visible order, so reordering or hiding columns
 * can't move the hierarchy. `warning` is set when `subRows.column` matches
 * nothing.
 */
export function resolveTreeColumnKey<TRow extends Record<string, unknown>>(
  columns: Column<TRow>[],
  subRows: SubRowsOptions<TRow> | undefined,
): { key: string | undefined; warning?: string } {
  if (!subRows || columns.length === 0) return { key: undefined };
  const keys = columns.map((col, index) => columnKeyAt(col, index));
  if (subRows.column === undefined || keys.includes(subRows.column)) {
    return { key: subRows.column ?? keys[0] };
  }
  return {
    key: keys[0],
    warning: `[DataTable] \`subRows.column\` is "${subRows.column}", but no column has that key. The first column carries the hierarchy instead.`,
  };
}

export type SubRowsState<TRow extends Record<string, unknown>> = {
  /** The tree built from the page's rows, or `null` without `subRows`. */
  index: TreeIndex<TRow> | null;
  visibleRows: DataTableTreeRow<TRow>[] | undefined;
  expandedSubRowIds: string[] | undefined;
  toggleSubRows: ((row: TRow) => void) | undefined;
  /** Misuse to report once each: see `useOnceWarnings`. */
  warnings: string[];
};

/**
 * @internal
 * Builds the tree from the page's rows and `subRows.getSubRows`, keeps which
 * rows are open (by row id, controlled or not), and lists the rows to render.
 */
export function useSubRows<TRow extends Record<string, unknown>>(
  rows: TRow[],
  subRows: SubRowsOptions<TRow> | undefined,
  rowExpansion: RowExpansionOptions<TRow> | undefined,
  getRowId: (row: TRow) => string | null,
): SubRowsState<TRow> {
  const getSubRows = subRows?.getSubRows;

  const { index, cycleIds } = useMemo(() => {
    if (!getSubRows) return { index: null, cycleIds: [] };
    // A row without an id can't be opened or selected: it gets a key no real
    // id can match, no sub-rows, and is locked.
    let anonymous = 0;
    // A row listed beneath itself (say, a root whose parent id is its own)
    // would nest forever, so it's left out of its own sub-rows.
    const cycles = new Set<string>();
    const tree = buildTree(rows, (row, { parents }) => {
      const id = getRowId(row);
      if (id === null) {
        return { key: `\u0000row-without-id:${anonymous++}`, label: "", disabled: true };
      }
      const ancestry = new Set([...parents.map(getRowId), id]);
      const children = getSubRows(row)?.filter((child) => {
        const childId = getRowId(child);
        if (childId === null || !ancestry.has(childId)) return true;
        cycles.add(childId);
        return false;
      });
      return { key: id, label: "", children };
    });
    return { index: indexTree(tree), cycleIds: [...cycles] };
  }, [rows, getSubRows, getRowId]);

  const warnings: string[] = [];
  if (subRows && rowExpansion) {
    warnings.push(
      "[DataTable] `subRows` and `rowExpansion` can't be combined: a row shows either its sub-rows or a detail panel. `rowExpansion` is ignored.",
    );
  }
  if (cycleIds.length > 0) {
    warnings.push(
      `[DataTable] \`subRows.getSubRows\` lists these rows beneath themselves: ${cycleIds
        .map((id) => JSON.stringify(id))
        .join(", ")}. They're left out of their own sub-rows.`,
    );
  }
  if (index && index.mixedKeys.length > 0) {
    warnings.push(
      `[DataTable] These row ids have sub-rows in one place and none in another: ${index.mixedKeys
        .map((key) => JSON.stringify(key))
        .join(", ")}. A row id is one row, so give each a unique id.`,
    );
  }

  const {
    expandedIds: openIds,
    isExpanded,
    toggleExpand,
  } = useTreeExpansion({
    expandedIds: subRows?.expandedIds,
    defaultExpandedIds: subRows?.defaultExpandedIds,
    onExpandedChange: subRows?.onExpandedChange,
  });

  const visibleRows = useMemo(() => {
    if (!index) return undefined;
    return flattenVisible(index.tree, (id) => {
      const node = index.byId.get(id);
      return node !== undefined && isExpanded(node.key);
    }).map(
      ({ node, depth, expanded }): DataTableTreeRow<TRow> => ({
        row: node.item,
        depth,
        hasSubRows: !node.isLeaf,
        expanded,
        key: node.id,
      }),
    );
  }, [index, isExpanded]);

  const toggleSubRows = useCallback(
    (row: TRow) => {
      const id = getRowId(row);
      if (id !== null) toggleExpand(id);
    },
    [getRowId, toggleExpand],
  );

  return {
    index,
    visibleRows,
    expandedSubRowIds: index ? openIds : undefined,
    toggleSubRows: index ? toggleSubRows : undefined,
    warnings,
  };
}
