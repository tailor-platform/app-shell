import type {
  LineItemsChangeSet,
  LineItemsLineChange,
  LineItemsOrderingMode,
  LineItemsRowData,
  LineItemsRowPatch,
} from "./types";

/* ======================================================================== */
/* Internal column shape consumed by the change-set engine                   */
/* ======================================================================== */

export type LineItemsMutationScope = "document" | "metadata";

/**
 * Internal column descriptor used by the change-set engine. Public API consumers
 * never see this shape — they describe columns with `LineItemsField` and the
 * `fieldToColumnDef` adapter (in `field.ts`) translates each field into this
 * shape so the change-set logic below stays unchanged.
 */
export type LineItemsColumnDef<TRow extends LineItemsRowData> = {
  id: string;
  accessorKey?: keyof TRow & string;
  /** "document" (default): bundled into the change-set; "metadata": per-cell delta. */
  mutationScope?: LineItemsMutationScope;
  /** Coerce raw input (e.g. trim strings, parse numbers) before equality compare. */
  normalize?: (value: unknown, row: TRow) => unknown;
  /** Tolerance-aware equality (e.g. for floats). */
  equals?: (a: unknown, b: unknown, row: TRow) => boolean;
};

/* ======================================================================== */
/* Baseline + change-set engine                                              */
/* ======================================================================== */

/** Baseline captures document order plus row snapshots keyed by ref. */
export type LineItemsBaseline<TRow extends LineItemsRowData> = {
  order: string[];
  rows: Record<string, TRow>;
};

function defaultNormalizeValue(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  return value;
}

function defaultEquality(a: unknown, b: unknown): boolean {
  return Object.is(a, b);
}

export function normalizeField<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
  key: string,
  value: unknown,
  row: TRow,
): unknown {
  const col = cols.find((c) => (c.accessorKey as string | undefined) === key || c.id === key);
  if (col?.normalize) return col.normalize(value, row);
  return defaultNormalizeValue(value);
}

function equalsField<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
  key: string,
  a: unknown,
  b: unknown,
  row: TRow,
): boolean {
  const col = cols.find((c) => (c.accessorKey as string | undefined) === key || c.id === key);
  if (col?.equals) return col.equals(a, b, row);
  return defaultEquality(a, b);
}

export function computeDocumentPatches<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
  baseline: LineItemsBaseline<TRow>,
  currentOrder: readonly string[],
  currentByRef: Record<string, TRow | undefined>,
  removedRefs: ReadonlySet<string>,
  insertedRefs: ReadonlySet<string>,
  orderingMode: LineItemsOrderingMode,
): LineItemsLineChange[] {
  const documentKeys = columnsByScope(cols, "document");
  const lines: LineItemsLineChange[] = [];

  /** Removals for ids that existed in baseline. */
  for (const id of baseline.order) {
    if (removedRefs.has(id) || !currentOrder.includes(id)) {
      if (baseline.rows[id]) lines.push({ action: "remove", lineRef: id });
    }
  }

  /** Adds — new logical ids never present in baseline. */
  for (const id of currentOrder) {
    if (!insertedRefs.has(id) || baseline.rows[id]) continue;
    const row = currentByRef[id];
    if (!row) continue;
    const insertAfter = previousRefInOrder(currentOrder, id);
    const patch = pickDocumentPatch(cols, row, documentKeys);
    lines.push({ action: "add", lineRef: id, insertAfterLineRef: insertAfter, patch });
  }

  /** Updates for persisted rows. */
  for (const id of currentOrder) {
    if (removedRefs.has(id)) continue;
    const base = baseline.rows[id];
    const row = currentByRef[id];
    if (!row || !base) continue;
    if (insertedRefs.has(id) && !baseline.rows[id]) continue;

    const patch: LineItemsRowPatch = {};
    for (const key of documentKeys) {
      if (key === "lineRef") continue;
      const rawCur = row[key as keyof TRow];
      const rawBase = base[key as keyof TRow];
      const nCur = normalizeField(cols, key, rawCur, row);
      const nBase = normalizeField(cols, key, rawBase, base);
      if (!equalsField(cols, key, nCur, nBase, row)) patch[key] = nCur;
    }
    if (Object.keys(patch).length > 0) lines.push({ action: "update", lineRef: id, patch });
  }

  if (orderingMode === "manual") {
    lines.push(
      ...diffPersistedMoves(
        baseline.order,
        currentOrder,
        baseline.rows,
        insertedRefs,
        removedRefs,
        currentByRef,
      ),
    );
  }

  return lines;
}

/** Emit move ops for persisted ids whose predecessor changed vs baseline. */
function diffPersistedMoves<TRow extends LineItemsRowData>(
  baseOrderFull: readonly string[],
  curOrderFull: readonly string[],
  baselineRows: Record<string, TRow>,
  insertedRefs: ReadonlySet<string>,
  removedRefs: ReadonlySet<string>,
  currentByRef: Record<string, TRow | undefined>,
): LineItemsLineChange[] {
  const persisted = (ids: readonly string[]) =>
    ids.filter(
      (id) => baselineRows[id] && currentByRef[id] && !removedRefs.has(id) && !insertedRefs.has(id),
    );

  const baseIds = persisted(baseOrderFull);
  const curIds = persisted(curOrderFull);
  if (baseIds.length !== curIds.length || !setsEqual(new Set(baseIds), new Set(curIds))) return [];

  const basePred = new Map<string, string | null>();
  for (let i = 0; i < baseIds.length; i++) {
    basePred.set(baseIds[i]!, i === 0 ? null : baseIds[i - 1]!);
  }

  const moves: LineItemsLineChange[] = [];
  /** Single pass — any id whose predecessor in current differs from predecessor in baseline moved. */
  for (let i = 0; i < curIds.length; i++) {
    const id = curIds[i]!;
    const curPred = i === 0 ? null : curIds[i - 1]!;
    if (basePred.get(id) !== curPred)
      moves.push({ action: "move", lineRef: id, afterLineRef: curPred });
  }
  return moves;
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function previousRefInOrder(order: readonly string[], id: string): string | null {
  const idx = order.indexOf(id);
  if (idx <= 0) return null;
  return order[idx - 1]!;
}

function columnsByScope<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
  scope: LineItemsMutationScope,
): string[] {
  const keys: string[] = [];
  for (const c of cols) {
    const s = c.mutationScope ?? "document";
    if (s !== scope) continue;
    const key = (c.accessorKey as string | undefined) ?? c.id;
    if (key && key !== "lineRef") keys.push(key);
  }
  return keys;
}

function pickDocumentPatch<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
  row: TRow,
  documentKeys: string[],
): LineItemsRowPatch {
  const patch: LineItemsRowPatch = {};
  for (const key of documentKeys) {
    if (key === "lineRef") continue;
    const v = row[key as keyof TRow];
    patch[key] = normalizeField(cols, key, v, row);
  }
  return patch;
}

export function buildChangeSet<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
  baseline: LineItemsBaseline<TRow>,
  currentOrder: readonly string[],
  currentByRef: Record<string, TRow | undefined>,
  removedRefs: ReadonlySet<string>,
  insertedRefs: ReadonlySet<string>,
  orderingMode: LineItemsOrderingMode,
): LineItemsChangeSet {
  const lineChanges = computeDocumentPatches(
    cols,
    baseline,
    currentOrder,
    currentByRef,
    removedRefs,
    insertedRefs,
    orderingMode,
  );
  return { lineChanges };
}

export function isChangeSetEmpty(cs: LineItemsChangeSet): boolean {
  return cs.lineChanges.length === 0;
}

/** Deep clone row for baseline using JSON when possible. */
export function cloneRow<TRow extends LineItemsRowData>(row: TRow): TRow {
  try {
    return structuredClone(row) as TRow;
  } catch {
    return { ...row } as TRow;
  }
}

export function cloneBaseline<TRow extends LineItemsRowData>(
  order: readonly string[],
  byRef: Record<string, TRow | undefined>,
): LineItemsBaseline<TRow> {
  const rows: Record<string, TRow> = {};
  for (const id of order) {
    const r = byRef[id];
    if (r) rows[id] = cloneRow(r);
  }
  return { order: [...order], rows };
}

/** Test helper — resolve normalize for a column key. */
export function getColumnNormalizeFn<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
  key: string,
): (value: unknown, row: TRow) => unknown {
  const col = cols.find((c) => (c.accessorKey as string | undefined) === key || c.id === key);
  return (v: unknown, row: TRow) =>
    col?.normalize ? col.normalize(v, row) : defaultNormalizeValue(v);
}
