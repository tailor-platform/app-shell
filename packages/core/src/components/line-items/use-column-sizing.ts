import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import {
  measureAutoColumns,
  resolveColumnSizing,
  type ColumnSizing,
  type SizingColumn,
} from "./column-sizing";

function sameSizing(left: ColumnSizing, right: ColumnSizing): boolean {
  return (
    left.tableWidth === right.tableWidth &&
    left.spacerWidth === right.spacerWidth &&
    left.widths.size === right.widths.size &&
    [...left.widths].every(([id, width]) => right.widths.get(id) === width)
  );
}

/** Internal: scope changes replace the document; equivalent column arrays retain observations. */
export function useColumnSizing(
  tableRef: RefObject<HTMLTableElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  columns: readonly SizingColumn[],
  scope: unknown,
): ColumnSizing {
  const schema = JSON.stringify(columns.map(({ id, width }) => [id, width]));
  const [cache, setCache] = useState(() => ({ schema, scope, widths: new Map<string, number>() }));
  if (cache.schema !== schema || !Object.is(cache.scope, scope)) {
    setCache({ schema, scope, widths: new Map<string, number>() });
  }
  const observed = cache.widths;
  const [sizing, setSizing] = useState(() => resolveColumnSizing(columns, 0, observed));
  const measure = useCallback(() => {
    const table = tableRef.current;
    const container = containerRef.current;
    if (!table || !container || container.clientWidth === 0) return;
    measureAutoColumns(table, columns, observed);
    const next = resolveColumnSizing(columns, container.clientWidth, observed);
    setSizing((previous) => (sameSizing(previous, next) ? previous : next));
  }, [tableRef, containerRef, columns, observed]);

  // Re-rendering a mounted window/footer can change intrinsic content without a resize.
  useLayoutEffect(measure);
  useLayoutEffect(() => {
    const table = tableRef.current;
    const container = containerRef.current;
    if (!table || !container) return;
    const resize = new ResizeObserver(measure);
    resize.observe(container);
    resize.observe(table);
    const mutations = new MutationObserver(measure);
    mutations.observe(table, { subtree: true, childList: true, characterData: true });
    return () => {
      resize.disconnect();
      mutations.disconnect();
    };
  }, [tableRef, containerRef, measure]);
  return sizing;
}
