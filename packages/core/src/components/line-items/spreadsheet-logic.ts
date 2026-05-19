/** Logical cell coordinate in the editable grid area (excluding __ columns). */
export type GridCoord = { lineRef: string; columnId: string };

export function moveSelectionCoord(
  dir: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
  active: GridCoord,
  orderedLineRefs: readonly string[],
  columnIds: readonly string[],
): GridCoord | null {
  const ri = orderedLineRefs.indexOf(active.lineRef);
  const ci = columnIds.indexOf(active.columnId);
  if (ri < 0 || ci < 0) return null;
  let nr = ri;
  let nc = ci;
  if (dir === "ArrowUp") nr = Math.max(0, ri - 1);
  if (dir === "ArrowDown") nr = Math.min(orderedLineRefs.length - 1, ri + 1);
  if (dir === "ArrowLeft") nc = Math.max(0, ci - 1);
  if (dir === "ArrowRight") nc = Math.min(columnIds.length - 1, ci + 1);
  const lineRef = orderedLineRefs[nr];
  const columnId = columnIds[nc];
  if (!lineRef || !columnId) return null;
  return { lineRef, columnId };
}

export function rectangularCells(
  orderedLineRefs: readonly string[],
  columnIds: readonly string[],
  a: GridCoord,
  b: GridCoord,
): GridCoord[] {
  const ri1 = orderedLineRefs.indexOf(a.lineRef);
  const ri2 = orderedLineRefs.indexOf(b.lineRef);
  const ci1 = columnIds.indexOf(a.columnId);
  const ci2 = columnIds.indexOf(b.columnId);
  if (ri1 < 0 || ri2 < 0 || ci1 < 0 || ci2 < 0) return [];
  const r0 = Math.min(ri1, ri2);
  const r1 = Math.max(ri1, ri2);
  const c0 = Math.min(ci1, ci2);
  const c1 = Math.max(ci1, ci2);
  const out: GridCoord[] = [];
  for (let r = r0; r <= r1; r++) {
    const lineRef = orderedLineRefs[r];
    if (!lineRef) continue;
    for (let c = c0; c <= c1; c++) {
      const columnId = columnIds[c];
      if (columnId) out.push({ lineRef, columnId });
    }
  }
  return out;
}

/** Build rectangular row slice for TSV in schema column order within the bbox. */
export function coordsToRowsMatrix(
  orderedLineRefs: readonly string[],
  columnIdsOrdered: readonly string[],
  coords: GridCoord[],
  getDisplay: (lineRef: string, columnId: string) => string,
): string[][] {
  if (!coords.length || !orderedLineRefs.length || !columnIdsOrdered.length) return [];

  let r0 = Number.POSITIVE_INFINITY;
  let r1 = Number.NEGATIVE_INFINITY;
  let c0 = Number.POSITIVE_INFINITY;
  let c1 = Number.NEGATIVE_INFINITY;

  let found = false;
  for (const { lineRef, columnId } of coords) {
    const ri = orderedLineRefs.indexOf(lineRef);
    const ci = columnIdsOrdered.indexOf(columnId);
    if (ri < 0 || ci < 0) continue;
    found = true;
    r0 = Math.min(r0, ri);
    r1 = Math.max(r1, ri);
    c0 = Math.min(c0, ci);
    c1 = Math.max(c1, ci);
  }
  if (!found) return [];

  const lines: string[] = [];
  for (let r = r0; r <= r1; r++) {
    const lr = orderedLineRefs[r];
    if (lr) lines.push(lr);
  }

  const columnSpan: string[] = [];
  for (let c = c0; c <= c1; c++) {
    const id = columnIdsOrdered[c];
    if (id) columnSpan.push(id);
  }

  return lines.map((lr) => columnSpan.map((cid) => getDisplay(lr, cid)));
}

export function serializeMatrixTsv(rows: string[][]): string {
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
  return a.lineRef === b.lineRef && a.columnId === b.columnId;
}
