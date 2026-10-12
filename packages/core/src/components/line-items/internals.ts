import type {
  LineItemsChangeSet,
  LineItemsLineChange,
  LineItemsOrderingMode,
  LineItemsRowData,
  LineItemsRowPatch,
} from "./types";

/**
 * `"excluded"` columns never reach the change-set — computed and read-only
 * columns are flagged this way so a derived total is not submitted as an edit.
 */
export type LineItemsMutationScope = "document" | "excluded";

/**
 * Internal column descriptor consumed by the change-set engine. Consumers
 * describe columns with `LineItemsField`; `fieldToColumnDef` translates each
 * into this shape.
 */
export type LineItemsColumnDef<TRow extends LineItemsRowData> = {
  id: string;
  accessorKey?: keyof TRow & string;
  mutationScope?: LineItemsMutationScope;
  normalize?: (value: unknown, row: TRow) => unknown;
  equals?: (a: unknown, b: unknown, row: TRow) => boolean;
};

/** Baseline captures document order plus row snapshots keyed by `lineRef`. */
export type LineItemsBaseline<TRow extends LineItemsRowData> = {
  order: string[];
  rows: Record<string, TRow>;
};

function defaultNormalizeValue(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  return value;
}

/**
 * Indexes columns by both `accessorKey` and `id` so per-key lookups during a
 * diff are O(1) — `getChangeSet` runs on every render to derive `isDirty`, over
 * every row and column.
 */
function indexColumns<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
): Map<string, LineItemsColumnDef<TRow>> {
  const index = new Map<string, LineItemsColumnDef<TRow>>();
  for (const col of cols) {
    if (col.accessorKey && !index.has(col.accessorKey)) index.set(col.accessorKey, col);
    if (!index.has(col.id)) index.set(col.id, col);
  }
  return index;
}

/**
 * Resolves a single value through its column's normalizer. Used by paste and
 * fill, which coerce incoming text before writing it into a row.
 */
export function normalizeField<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
  key: string,
  value: unknown,
  row: TRow,
): unknown {
  const col = cols.find((c) => c.accessorKey === key || c.id === key);
  if (col?.normalize) return col.normalize(value, row);
  return defaultNormalizeValue(value);
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
  const columnIndex = indexColumns(cols);
  const documentKeys = columnsByScope(cols, "document");
  const currentIds = new Set(currentOrder);
  const lines: LineItemsLineChange[] = [];

  const normalize = (key: string, value: unknown, row: TRow): unknown => {
    const col = columnIndex.get(key);
    if (col?.normalize) return col.normalize(value, row);
    return defaultNormalizeValue(value);
  };

  const equals = (key: string, a: unknown, b: unknown, row: TRow): boolean => {
    const col = columnIndex.get(key);
    if (col?.equals) return col.equals(a, b, row);
    return Object.is(a, b);
  };

  for (const id of baseline.order) {
    if (removedRefs.has(id) || !currentIds.has(id)) {
      if (baseline.rows[id]) lines.push({ action: "remove", lineId: id });
    }
  }

  for (const id of currentOrder) {
    if (!insertedRefs.has(id) || baseline.rows[id]) continue;
    const row = currentByRef[id];
    if (!row) continue;
    const data: LineItemsRowPatch = {};
    for (const key of documentKeys) {
      data[key] = normalize(key, row[key as keyof TRow], row);
    }
    lines.push({ action: "add", tempId: id, data });
  }

  for (const id of currentOrder) {
    if (removedRefs.has(id)) continue;
    const base = baseline.rows[id];
    const row = currentByRef[id];
    if (!row || !base) continue;

    const patch: LineItemsRowPatch = {};
    for (const key of documentKeys) {
      const nCur = normalize(key, row[key as keyof TRow], row);
      const nBase = normalize(key, base[key as keyof TRow], base);
      if (!equals(key, nCur, nBase, row)) patch[key] = nCur;
    }
    if (Object.keys(patch).length > 0) lines.push({ action: "update", lineId: id, patch });
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

/**
 * Emits a `reorder` op for each persisted line whose index moved relative to
 * baseline. Restricted to lines present in both baseline and current state, so
 * an add or remove shifting everything below it does not read as N moves.
 */
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

  const baseIndex = new Map<string, number>();
  for (let i = 0; i < baseIds.length; i++) baseIndex.set(baseIds[i]!, i);

  const reorders: LineItemsLineChange[] = [];
  for (let i = 0; i < curIds.length; i++) {
    const id = curIds[i]!;
    if (baseIndex.get(id) !== i) {
      reorders.push({ action: "reorder", lineId: id, position: i });
    }
  }
  return reorders;
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function columnsByScope<TRow extends LineItemsRowData>(
  cols: LineItemsColumnDef<TRow>[],
  scope: LineItemsMutationScope,
): string[] {
  const keys: string[] = [];
  for (const c of cols) {
    if ((c.mutationScope ?? "document") !== scope) continue;
    const key = (c.accessorKey as string | undefined) ?? c.id;
    if (key && key !== "lineRef") keys.push(key);
  }
  return keys;
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
  return { isEmpty: lineChanges.length === 0, lineChanges };
}

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
