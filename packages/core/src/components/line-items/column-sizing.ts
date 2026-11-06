/** Internal geometry contract, independent of either table's public column type. */
export type SizingColumn = {
  id: string;
  width?: number | "flex";
};

export type ColumnSizing = {
  widths: ReadonlyMap<string, number>;
  tableWidth: number;
  spacerWidth: number;
};

const FLEX_MIN_WIDTH = 120;
const AUTO_MIN_WIDTH = 32;

function nonNegative(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number`);
  }
}

export function resolveColumnSizing(
  columns: readonly SizingColumn[],
  viewportWidth: number,
  autoWidths: ReadonlyMap<string, number>,
): ColumnSizing {
  nonNegative(viewportWidth, "Viewport width");
  const widths = new Map<string, number>();
  let fixed = 0;
  let flexCount = 0;
  for (const column of columns) {
    if (!column.id || widths.has(column.id)) {
      throw new Error("Column IDs must be non-empty and unique");
    }
    let width: number;
    if (column.width === "flex") {
      width = 0;
      flexCount++;
    } else if (column.width !== undefined) {
      nonNegative(column.width, `Width of ${column.id}`);
      width = column.width;
    } else {
      const measured = autoWidths.get(column.id) ?? 0;
      nonNegative(measured, `Measured width of ${column.id}`);
      width = Math.max(AUTO_MIN_WIDTH, measured);
    }
    widths.set(column.id, width);
    fixed += width;
  }
  const flexWidth =
    flexCount > 0 ? Math.max(FLEX_MIN_WIDTH, (viewportWidth - fixed) / flexCount) : 0;
  for (const column of columns) {
    if (column.width === "flex") widths.set(column.id, flexWidth);
  }
  const contentWidth = fixed + flexCount * flexWidth;
  const spacerWidth = flexCount === 0 ? Math.max(0, viewportWidth - contentWidth) : 0;
  return { widths, tableWidth: contentWidth + spacerWidth, spacerWidth };
}

/**
 * Measure intrinsic auto widths on the existing DOM before restoring fixed layout.
 * Assigned col widths are not intrinsic widths; spans (details/virtual spacers) have
 * no single column owner and must not contribute to this sizing pass.
 */
export function measureAutoColumns(
  table: HTMLTableElement,
  columns: readonly SizingColumn[],
  observed: Map<string, number>,
): void {
  const autoIds = new Set(
    columns.filter((column) => column.width === undefined).map((column) => column.id),
  );
  if (autoIds.size === 0 || table.getBoundingClientRect().width === 0) return;

  const cols = Array.from(
    table.querySelectorAll<HTMLTableColElement>("col[data-column-id]"),
  ).filter((col) => col.closest("table") === table);
  const excluded = Array.from(table.rows).flatMap((row) =>
    Array.from(row.cells).filter((cell) => cell.colSpan !== 1),
  );
  const spanRows = [...new Set(excluded.map((cell) => cell.parentElement!))];
  const rowHeights = spanRows.map((row) => row.getBoundingClientRect().height);
  const changed: HTMLElement[] = [table, ...cols, ...excluded, ...spanRows];
  const styles = changed.map((element) => element.style.cssText);
  const container = table.parentElement;
  const scrollLeft = container?.scrollLeft ?? 0;
  const scrollTop = container?.scrollTop ?? 0;
  try {
    table.style.tableLayout = "auto";
    table.style.width = "max-content";
    table.style.minWidth = "0";
    table.style.maxWidth = "none";
    for (const col of cols) {
      col.style.removeProperty("width");
      col.style.removeProperty("min-width");
      col.style.removeProperty("max-width");
    }
    // Keep detail editors rendered and virtual spacer heights intact while their
    // cells leave intrinsic width calculation; display:none would lose focus.
    spanRows.forEach((row, index) => {
      row.style.height = `${rowHeights[index]}px`;
    });
    for (const cell of excluded) {
      cell.style.position = "absolute";
      cell.style.width = "0";
      cell.style.minWidth = "0";
      cell.style.maxWidth = "0";
    }
    for (const col of cols) {
      const id = col.dataset.columnId!;
      if (!autoIds.has(id)) continue;
      const width = col.getBoundingClientRect().width;
      if (width > 0) observed.set(id, Math.max(observed.get(id) ?? 0, width));
    }
  } finally {
    changed.forEach((element, index) => {
      element.style.cssText = styles[index]!;
    });
    if (container) {
      container.scrollLeft = scrollLeft;
      container.scrollTop = scrollTop;
    }
  }
}
