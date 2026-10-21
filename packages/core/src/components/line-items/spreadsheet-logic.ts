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

/**
 * Quotes a cell the way spreadsheets do (RFC 4180 style): one holding a tab,
 * line break or quote is wrapped in quotes, with inner quotes doubled.
 */
function quoteTsvCell(cell: string): string {
  return /[\t\n\r"]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function serializeMatrixTsv(rows: readonly string[][]): string {
  return rows.map((r) => r.map(quoteTsvCell).join("\t")).join("\n");
}

/**
 * Parses tab-separated text from a spreadsheet. A cell that starts with a
 * quote runs to its closing quote, so line breaks and tabs inside it stay in
 * the cell, and `""` reads as one quote — how Excel and Sheets copy a cell
 * with a line break in it. A quote anywhere else is plain text.
 */
export function parseClipboardTsv(text: string): string[][] {
  if (!text.trim()) return [];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i]!;
    if (ch === '"' && cell === "") {
      // Quoted cell: read to the closing quote.
      i++;
      while (i < text.length) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        cell += text[i];
        i++;
      }
      continue;
    }
    if (ch === "\t") {
      endCell();
    } else if (ch === "\r" || ch === "\n") {
      endRow();
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      cell += ch;
    }
    i++;
  }
  // A trailing line break ends the last row rather than starting an empty one.
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

export function sameCoord(a: GridCoord | null, b: GridCoord | null): boolean {
  if (!a || !b) return false;
  return a.lineKey === b.lineKey && a.columnId === b.columnId;
}
