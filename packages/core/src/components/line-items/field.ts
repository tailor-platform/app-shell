import type { LineItemsColumnDef } from "./internals";
import type { LineItemsField, LineItemsMode, LineItemsRowData } from "./types";

/**
 * Field schema builder. Use it to get full TS inference of `key`, `render(line)`,
 * and `sort.comparator` for a row shape `T`.
 *
 * @example
 * type POLine = { lineRef: string; sku: string; quantity: number; total: number };
 * const f = createLineItemHelper<POLine>();
 * const fields = [
 *   f.field({ key: "sku", label: "SKU", render: (l) => l.sku, editable: ["edit"], type: { kind: "text" } }),
 *   f.field({ key: "quantity", label: "Qty", render: (l) => l.quantity, editable: ["edit", "amend"], type: { kind: "number", decimals: 0 }, align: "right" }),
 *   f.field({ key: "total", label: "Total", render: (l) => l.total.toFixed(2), align: "right" }),
 * ];
 */
export function createLineItemHelper<T extends LineItemsRowData>() {
  return {
    field: (f: LineItemsField<T>): LineItemsField<T> => f,
  };
}

/* ======================================================================== */
/* Field-mode helpers                                                        */
/* ======================================================================== */

/** True if the field's input should be rendered (vs the read-only `render` output) for the current mode. */
export function fieldIsEditableInMode<T extends LineItemsRowData>(
  field: LineItemsField<T>,
  mode: LineItemsMode,
): boolean {
  if (mode === "display") return false;
  if (!field.editable || field.editable.length === 0) return false;
  return field.editable.includes(mode);
}

/**
 * Whether the field participates in the document change-set (vs per-cell metadata
 * deltas). Defaults to "document" for editable fields. Computed read-only fields
 * are flagged as "metadata" so they are skipped by the change-set engine.
 */
export function fieldCommitScope<T extends LineItemsRowData>(
  field: LineItemsField<T>,
): "document" | "metadata" {
  const editableSomewhere = (field.editable?.length ?? 0) > 0;
  if (!editableSomewhere) return "metadata";
  return field.commit ?? "document";
}

/** Whether the column accepts paste (TSV) for the current mode. */
export function fieldAllowsPaste<T extends LineItemsRowData>(
  field: LineItemsField<T>,
  mode: LineItemsMode,
): boolean {
  return fieldIsEditableInMode(field, mode);
}

/** Whether a fill-handle should be rendered for the current mode. */
export function fieldAllowsFill<T extends LineItemsRowData>(
  field: LineItemsField<T>,
  mode: LineItemsMode,
): boolean {
  if (mode !== "edit") return false;
  return fieldIsEditableInMode(field, "edit") && fieldCommitScope(field) === "document";
}

/* ======================================================================== */
/* Field -> internal column adapter                                          */
/* ======================================================================== */

/**
 * Translate a single `LineItemsField` into the internal `LineItemsColumnDef`
 * shape consumed by `internals.ts` (change-set + normalization + equality).
 *
 * Numeric fields get a normalizer that coerces strings to numbers (trimming and
 * rounding by `decimals`) and a tolerance-aware `equals` so cosmetic input
 * variations like "1" vs "1.00" don't show up as document changes.
 */
export function fieldToColumnDef<T extends LineItemsRowData>(
  field: LineItemsField<T>,
): LineItemsColumnDef<T> {
  const accessorKey = field.key as keyof T & string;
  const scope = fieldCommitScope(field);

  const def: LineItemsColumnDef<T> = {
    id: field.key,
    accessorKey,
    mutationScope: scope,
  };

  if (field.type?.kind === "number") {
    const decimals = field.type.decimals;
    def.normalize = (value: unknown): unknown => {
      if (value === "" || value === null || value === undefined) return null;
      const n = typeof value === "number" ? value : Number(String(value).trim());
      if (Number.isNaN(n)) return value;
      if (typeof decimals === "number") {
        const factor = 10 ** decimals;
        return Math.round(n * factor) / factor;
      }
      return n;
    };
    def.equals = (a: unknown, b: unknown): boolean => {
      if (a === b) return true;
      if (a == null || b == null) return a == null && b == null;
      const an = Number(a);
      const bn = Number(b);
      if (Number.isNaN(an) || Number.isNaN(bn)) return Object.is(a, b);
      return Math.abs(an - bn) < 1e-9;
    };
  }

  return def;
}

/** Translate a list of fields into internal column defs. */
export function fieldsToColumnDefs<T extends LineItemsRowData>(
  fields: LineItemsField<T>[],
): LineItemsColumnDef<T>[] {
  return fields.map((f) => fieldToColumnDef(f));
}
