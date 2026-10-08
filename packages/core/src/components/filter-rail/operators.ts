// In-memory evaluation of the filter operators the rail can emit. Private to
// `useFilterRailCounts`; a backend-driven screen never runs this.

/** Numbers compare numerically; everything else (ISO dates, strings) lexically. */
const compare = (a: unknown, b: unknown): number => {
  if (typeof a === "number" || typeof b === "number") {
    return Math.sign(Number(a) - Number(b));
  }
  const as = String(a);
  const bs = String(b);
  if (as === bs) return 0;
  return as < bs ? -1 : 1;
};

/**
 * `useURLCollectionVariables` reads `f.x:eq=true` back as the string `"true"`,
 * so a boolean filter would match nothing after a reload without this.
 */
const coerce = (value: unknown, operand: unknown): unknown => {
  if (typeof value === "boolean" && (operand === "true" || operand === "false")) {
    return operand === "true";
  }
  if (typeof value === "number" && typeof operand === "string" && operand.trim() !== "") {
    const parsed = Number(operand);
    return Number.isNaN(parsed) ? operand : parsed;
  }
  return operand;
};

const lower = (value: unknown) => String(value ?? "").toLowerCase();

/** Whether `value` satisfies `operator operand`. Unknown operators match. */
export function matchesOperator(value: unknown, operator: string, operand: unknown): boolean {
  if (Array.isArray(value) && (operator === "in" || operator === "nin")) {
    // A list-valued cell matches `in` when any member does.
    const hit = value.some((member) => matchesOperator(member, "in", operand));
    return operator === "in" ? hit : !hit;
  }
  switch (operator) {
    case "eq":
      return value === coerce(value, operand);
    case "ne":
      return value !== coerce(value, operand);
    case "gt":
      return compare(value, operand) > 0;
    case "gte":
      return compare(value, operand) >= 0;
    case "lt":
      return compare(value, operand) < 0;
    case "lte":
      return compare(value, operand) <= 0;
    case "between": {
      const { min, max } = (operand ?? {}) as { min?: unknown; max?: unknown };
      return (
        (min === undefined || compare(value, min) >= 0) &&
        (max === undefined || compare(value, max) <= 0)
      );
    }
    case "in":
      return Array.isArray(operand) && operand.map(String).includes(String(value));
    case "nin":
      return Array.isArray(operand) && !operand.map(String).includes(String(value));
    case "contains":
      return lower(value).includes(lower(operand));
    case "notContains":
      return !lower(value).includes(lower(operand));
    case "hasPrefix":
      return lower(value).startsWith(lower(operand));
    case "notHasPrefix":
      return !lower(value).startsWith(lower(operand));
    case "hasSuffix":
      return lower(value).endsWith(lower(operand));
    case "notHasSuffix":
      return !lower(value).endsWith(lower(operand));
    default:
      return true;
  }
}
