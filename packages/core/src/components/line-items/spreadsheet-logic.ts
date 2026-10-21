/** Logical cell coordinate within the editable grid area. */
export type GridCoord = { lineKey: string; columnId: string };

export type GridDirection = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

/** Moves one cell in `dir`, clamped to the grid bounds. */
export function moveSelectionCoord(
  dir: GridDirection,
  active: GridCoord,
  orderedLineKeys: readonly string[],
  columnIds: readonly string[],
): GridCoord | null {
  const ri = orderedLineKeys.indexOf(active.lineKey);
  const ci = columnIds.indexOf(active.columnId);
  if (ri < 0 || ci < 0) return null;

  let nr = ri;
  let nc = ci;
  if (dir === "ArrowUp") nr = Math.max(0, ri - 1);
  if (dir === "ArrowDown") nr = Math.min(orderedLineKeys.length - 1, ri + 1);
  if (dir === "ArrowLeft") nc = Math.max(0, ci - 1);
  if (dir === "ArrowRight") nc = Math.min(columnIds.length - 1, ci + 1);

  const lineKey = orderedLineKeys[nr];
  const columnId = columnIds[nc];
  if (!lineKey || !columnId) return null;
  return { lineKey, columnId };
}

/** Every cell in the rectangle bounded by `a` and `b` (drag-select, shift-click). */
export function rectangularCells(
  orderedLineKeys: readonly string[],
  columnIds: readonly string[],
  a: GridCoord,
  b: GridCoord,
): GridCoord[] {
  const ri1 = orderedLineKeys.indexOf(a.lineKey);
  const ri2 = orderedLineKeys.indexOf(b.lineKey);
  const ci1 = columnIds.indexOf(a.columnId);
  const ci2 = columnIds.indexOf(b.columnId);
  if (ri1 < 0 || ri2 < 0 || ci1 < 0 || ci2 < 0) return [];

  const r0 = Math.min(ri1, ri2);
  const r1 = Math.max(ri1, ri2);
  const c0 = Math.min(ci1, ci2);
  const c1 = Math.max(ci1, ci2);

  const out: GridCoord[] = [];
  for (let r = r0; r <= r1; r++) {
    const lineKey = orderedLineKeys[r];
    if (!lineKey) continue;
    for (let c = c0; c <= c1; c++) {
      const columnId = columnIds[c];
      if (columnId) out.push({ lineKey, columnId });
    }
  }
  return out;
}

/**
 * Projects arbitrary coordinates onto their bounding box and reads it out in
 * document and schema order, which is what a TSV copy of a selection needs.
 */
export function coordsToRowsMatrix(
  orderedLineKeys: readonly string[],
  columnIdsOrdered: readonly string[],
  coords: readonly GridCoord[],
  getDisplay: (lineKey: string, columnId: string) => string,
): string[][] {
  if (!coords.length || !orderedLineKeys.length || !columnIdsOrdered.length) return [];

  let r0 = Number.POSITIVE_INFINITY;
  let r1 = Number.NEGATIVE_INFINITY;
  let c0 = Number.POSITIVE_INFINITY;
  let c1 = Number.NEGATIVE_INFINITY;
  let found = false;

  for (const { lineKey, columnId } of coords) {
    const ri = orderedLineKeys.indexOf(lineKey);
    const ci = columnIdsOrdered.indexOf(columnId);
    if (ri < 0 || ci < 0) continue;
    found = true;
    r0 = Math.min(r0, ri);
    r1 = Math.max(r1, ri);
    c0 = Math.min(c0, ci);
    c1 = Math.max(c1, ci);
  }
  if (!found) return [];

  const rowRefs: string[] = [];
  for (let r = r0; r <= r1; r++) {
    const ref = orderedLineKeys[r];
    if (ref) rowRefs.push(ref);
  }

  const columnSpan: string[] = [];
  for (let c = c0; c <= c1; c++) {
    const id = columnIdsOrdered[c];
    if (id) columnSpan.push(id);
  }

  return rowRefs.map((ref) => columnSpan.map((id) => getDisplay(ref, id)));
}

export function serializeMatrixTsv(rows: readonly string[][]): string {
  return rows.map((r) => r.join("\t")).join("\n");
}

export function parseClipboardTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.trim()) return [];
  const lines = normalized.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => line.split("\t"));
}

export function sameCoord(a: GridCoord | null, b: GridCoord | null): boolean {
  if (!a || !b) return false;
  return a.lineKey === b.lineKey && a.columnId === b.columnId;
}
