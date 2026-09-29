// ✅ Reusable Component: shared operator evaluation, used by both the flat
// collection query (local-collection.ts) and the boolean scope tree (scope.ts).

/** Numbers compare numerically; everything else (dates, strings) lexically. */
export function compare(a: unknown, b: unknown): number {
  if (typeof a === "number" || typeof b === "number") {
    const an = Number(a);
    const bn = Number(b);
    return an === bn ? 0 : an < bn ? -1 : 1;
  }
  const as = String(a);
  const bs = String(b);
  return as === bs ? 0 : as < bs ? -1 : 1;
}

/**
 * Evaluates one Tailor filter operator against one field value.
 * Mirrors the operator set `DataTable.Filters` can emit.
 */
/**
 * Undo the URL serializer's stringifying for booleans.
 *
 * `useURLCollectionVariables` writes `f.onShopify:eq=true` and reads it back as
 * the **string** `"true"`, so `true === "true"` is false and a boolean filter
 * that matched 1,180 rows matches 0 after a reload. Verified with a two-URL
 * repro on `/styles`.
 *
 * This is the same defect as an open app-shell ask (numeric `in` and `eq`), and it is fixed
 * here rather than in the rail on purpose: the rail commits a real `boolean`,
 * which is correct. `queryLocalCollection` stands in for the backend, and
 * coercing a known-boolean field is what a backend's own input parsing does.
 * Remove this the day the serializer preserves scalar types.
 */
const coerceScalar = (value: unknown, operand: unknown): unknown =>
  typeof value === "boolean" && (operand === "true" || operand === "false")
    ? operand === "true"
    : operand;

export function applyOperator(value: unknown, operator: string, operand: unknown): boolean {
  switch (operator) {
    case "eq":
      return value === coerceScalar(value, operand);
    case "ne":
      return value !== coerceScalar(value, operand);
    case "gt":
      return compare(value, operand) > 0;
    case "gte":
      return compare(value, operand) >= 0;
    case "lt":
      return compare(value, operand) < 0;
    case "lte":
      return compare(value, operand) <= 0;
    case "between": {
      const { min, max } = operand as { min: unknown; max: unknown };
      return compare(value, min) >= 0 && compare(value, max) <= 0;
    }
    case "in":
      return Array.isArray(operand) && operand.includes(value);
    case "nin":
      return Array.isArray(operand) && !operand.includes(value);
    case "contains":
      return String(value).toLowerCase().includes(String(operand).toLowerCase());
    case "notContains":
      return !String(value).toLowerCase().includes(String(operand).toLowerCase());
    case "hasPrefix":
      return String(value).toLowerCase().startsWith(String(operand).toLowerCase());
    case "notHasPrefix":
      return !String(value).toLowerCase().startsWith(String(operand).toLowerCase());
    case "hasSuffix":
      return String(value).toLowerCase().endsWith(String(operand).toLowerCase());
    case "notHasSuffix":
      return !String(value).toLowerCase().endsWith(String(operand).toLowerCase());
    case "regex": {
      // Tailor's case-insensitive string filters commit a "(?i)"-prefixed
      // pattern, which is not a valid JS regex — strip it and set the `i` flag.
      const pattern = String(operand);
      const insensitive = pattern.startsWith("(?i)");
      try {
        return new RegExp(insensitive ? pattern.slice(4) : pattern, insensitive ? "i" : "").test(
          String(value),
        );
      } catch {
        return true;
      }
    }
    default:
      // Unknown operator: don't silently drop every row.
      //
      // This fallback is why `notContains` was broken for so long — it has no
      // case of its own, so it landed here and matched everything, and
      // `sku-columns.tsx` offers it on the `seasons` column. A negation that
      // silently returns all rows is indistinguishable from a filter that did
      // not apply, so shout about it in dev.
      if (import.meta.env?.DEV) {
        console.error(`applyOperator: unknown operator "${operator}" — matching every row`);
      }
      return true;
  }
}
