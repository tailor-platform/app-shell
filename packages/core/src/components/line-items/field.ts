import type { LineItemsColumnDef, LineItemsMutationScope } from "./internals";
import type {
  LineItemsColumnAlign,
  LineItemsField,
  LineItemsFieldCommit,
  LineItemsMode,
  LineItemsRowData,
} from "./types";

/**
 * Field schema builder. Gives full inference of `key`, `render(line)`, and
 * `sort.comparator` for a row shape `T`.
 *
 * @example
 * type POLine = { lineRef: string; sku: string; quantity: number; total: number };
 * const f = createLineItemHelper<POLine>();
 * const fields = [
 *   f.field({ key: "sku", label: "SKU", render: (l) => l.sku, editable: ["edit"], type: { kind: "text" } }),
 *   f.field({ key: "quantity", label: "Qty", render: (l) => l.quantity, editable: ["edit"], type: { kind: "number", decimals: 0 } }),
 *   f.field({ key: "total", label: "Total", render: (l) => l.total.toFixed(2) }),
 * ];
 */
export function createLineItemHelper<T extends LineItemsRowData>() {
  return {
    field: (f: LineItemsField<T>): LineItemsField<T> => f,
  };
}

/**
 * Whether the field renders an editor (vs its read-only `render` output) in
 * `mode`. A field opts into amend by listing it, e.g. `editable: ["edit", "amend"]`.
 */
export function fieldIsEditableInMode<T extends LineItemsRowData>(
  field: LineItemsField<T>,
  mode: LineItemsMode,
): boolean {
  if (mode === "view") return false;
  if (!field.editable || field.editable.length === 0) return false;
  return field.editable.includes(mode);
}

/** Cells locked by amend's partial lock get a tint, so what is still editable reads clearly. */
export function fieldIsAmendLocked<T extends LineItemsRowData>(
  field: LineItemsField<T>,
  mode: LineItemsMode,
): boolean {
  return mode === "amend" && !fieldIsEditableInMode(field, mode);
}

/** Resolves where a field's edits go. Non-editable columns never reach the change-set. */
export function fieldCommitScope<T extends LineItemsRowData>(
  field: LineItemsField<T>,
): LineItemsFieldCommit {
  return field.commit ?? "document";
}

/**
 * Whether the field participates in the document change-set. Computed and
 * read-only columns are excluded, so a derived total never submits as an edit.
 */
export function fieldMutationScope<T extends LineItemsRowData>(
  field: LineItemsField<T>,
): LineItemsMutationScope {
  if ((field.editable?.length ?? 0) === 0) return "excluded";
  return fieldCommitScope(field) === "metadata" ? "excluded" : "document";
}

/** Whether the column accepts TSV paste in `mode`. */
export function fieldAllowsPaste<T extends LineItemsRowData>(
  field: LineItemsField<T>,
  mode: LineItemsMode,
): boolean {
  return fieldIsEditableInMode(field, mode);
}

/** Whether a fill handle should be offered for the column in `mode`. */
export function fieldAllowsFill<T extends LineItemsRowData>(
  field: LineItemsField<T>,
  mode: LineItemsMode,
): boolean {
  if (mode !== "edit") return false;
  return fieldIsEditableInMode(field, mode) && fieldMutationScope(field) === "document";
}

/**
 * Translates a field into the internal column descriptor the change-set engine
 * consumes.
 *
 * Numeric fields get a normalizer that coerces strings to numbers and rounds by
 * `decimals`, plus a tolerance-aware `equals`, so cosmetic input differences
 * like `"1"` vs `"1.00"` do not register as document changes. Precedence for
 * overrides runs field-level, then type-level, then these built-in defaults.
 */
export function fieldToColumnDef<T extends LineItemsRowData>(
  field: LineItemsField<T>,
): LineItemsColumnDef<T> {
  const def: LineItemsColumnDef<T> = {
    id: field.key,
    accessorKey: field.key as keyof T & string,
    mutationScope: fieldMutationScope(field),
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

  if (field.type?.kind === "custom") {
    if (field.type.normalize) def.normalize = field.type.normalize;
    if (field.type.equals) def.equals = field.type.equals;
  }

  if (field.normalize) def.normalize = field.normalize;
  if (field.equals) def.equals = field.equals;

  return def;
}

export function fieldsToColumnDefs<T extends LineItemsRowData>(
  fields: LineItemsField<T>[],
): LineItemsColumnDef<T>[] {
  return fields.map((f) => fieldToColumnDef(f));
}

/** Numbers right-align, booleans center, everything else left. */
export function defaultAlignForField<T extends LineItemsRowData>(
  field: LineItemsField<T>,
): LineItemsColumnAlign {
  if (field.align) return field.align;
  if (field.type?.kind === "number") return "right";
  if (field.type?.kind === "boolean") return "center";
  return "left";
}
