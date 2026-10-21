import type { FilterConfig, FilterOperator } from "@/types/collection";
import type { DataTableFilterConfig } from "../types";
import type { useDataTableT } from "../i18n";

// =============================================================================
// DataTable.Filters
// =============================================================================

/** Default operator per filter type used when adding a new filter chip. */
const DEFAULT_OPERATOR: Record<FilterConfig["type"], FilterOperator> = {
  enum: "in",
  boolean: "eq",
  string: "contains",
  number: "eq",
  decimal: "eq",
  datetime: "eq",
  date: "eq",
  time: "eq",
  uuid: "eq",
};

/** Number/temporal operators available in the operator selector. */
const NUMERIC_TEMPORAL_OPERATORS = ["eq", "ne", "gt", "gte", "lt", "lte", "between"] as const;

type NumericTemporalOperator = (typeof NUMERIC_TEMPORAL_OPERATORS)[number];

// Date filters use a slimmer, friendlier operator set: an exact date, inclusive
// "after"/"before" (gte/lte), and a between range. No gt/lt/ne.
const DATE_OPERATORS = ["eq", "gte", "lte", "between"] as const;

/** Operators offered for a temporal editor, narrowed for `date` columns. */
function temporalOperatorsFor(type: FilterConfig["type"]): readonly NumericTemporalOperator[] {
  return type === "date" ? DATE_OPERATORS : NUMERIC_TEMPORAL_OPERATORS;
}

/**
 * Operator options + initial selection for a numeric/temporal editor.
 *
 * A saved view or `useCollectionVariables` config can hold a filter whose
 * operator is no longer in the standard set — most importantly a `date` filter
 * on the now-dropped `gt`/`lt`/`ne` (the pre-narrowing operator set). In that
 * case we keep the incoming operator as a selectable, preselected option rather
 * than resetting to `eq`, so opening the editor and hitting Apply never silently
 * rewrites the filter's operator (e.g. "after X" → "on X"). A truly unknown
 * operator falls back to `eq`.
 */
function resolveTemporalOperator(
  standard: readonly NumericTemporalOperator[],
  current: FilterOperator,
): { items: readonly NumericTemporalOperator[]; initial: NumericTemporalOperator } {
  if (standard.includes(current as NumericTemporalOperator)) {
    return { items: standard, initial: current as NumericTemporalOperator };
  }
  if ((NUMERIC_TEMPORAL_OPERATORS as readonly string[]).includes(current)) {
    return {
      items: [...standard, current as NumericTemporalOperator],
      initial: current as NumericTemporalOperator,
    };
  }
  return { items: standard, initial: standard[0] ?? "eq" };
}

/** String operators available in the operator selector. */
const STRING_OPERATORS = ["eq", "ne", "contains", "notContains", "hasPrefix", "hasSuffix"] as const;

type StringOperator = (typeof STRING_OPERATORS)[number];

function getDefaultFilterOperators(type: FilterConfig["type"]): FilterOperator[] {
  switch (type) {
    case "string":
      return [...STRING_OPERATORS];
    case "date":
      return [...DATE_OPERATORS];
    case "number":
    case "decimal":
    case "datetime":
    case "time":
      return [...NUMERIC_TEMPORAL_OPERATORS];
    case "enum":
      return ["in"];
    case "boolean":
      return [...BOOLEAN_OPERATORS];
    case "uuid":
      return ["eq"];
  }
}

function isUiOperatorAllowedForType(type: FilterConfig["type"], operator: FilterOperator): boolean {
  switch (type) {
    case "string":
      return (STRING_OPERATORS as readonly string[]).includes(operator);
    case "date":
      return (DATE_OPERATORS as readonly string[]).includes(operator);
    case "number":
    case "decimal":
    case "datetime":
    case "time":
      return (NUMERIC_TEMPORAL_OPERATORS as readonly string[]).includes(operator);
    case "enum":
      return operator === "in";
    case "boolean":
      return (BOOLEAN_OPERATORS as readonly string[]).includes(operator);
    case "uuid":
      return operator === "eq";
  }
}

function getConfiguredFilterOperators(config: DataTableFilterConfig): FilterOperator[] | undefined {
  const configured = config.operators as readonly FilterOperator[] | undefined;
  if (!configured) return undefined;

  const defaults = getDefaultFilterOperators(config.type);
  const operators = configured.filter(
    (operator, index) => defaults.includes(operator) && configured.indexOf(operator) === index,
  );
  return operators.length > 0 ? [...operators] : [DEFAULT_OPERATOR[config.type]];
}

export function getVisibleFilterOperators(
  config: DataTableFilterConfig,
  current?: FilterOperator,
): FilterOperator[] {
  const operators = getConfiguredFilterOperators(config) ?? getDefaultFilterOperators(config.type);
  if (current && !operators.includes(current) && isUiOperatorAllowedForType(config.type, current)) {
    return [...operators, current];
  }
  return operators;
}

function getDefaultFilterOperator(config: DataTableFilterConfig): FilterOperator {
  return getConfiguredFilterOperators(config)?.[0] ?? DEFAULT_OPERATOR[config.type];
}

// =============================================================================
// Boolean filter — operator selector + True/False select
// =============================================================================

type BooleanOperator = "eq" | "ne";

const BOOLEAN_OPERATORS = ["eq", "ne"] as const;

export function getOperatorLabel(
  operator: FilterOperator,
  t: ReturnType<typeof useDataTableT>,
  type?: FilterConfig["type"],
): string {
  // Date columns relabel the comparison operators (exact date / after / before).
  if (type === "date") {
    if (operator === "eq") return t("filterDateOperator_eq");
    if (operator === "gte") return t("filterDateOperator_gte");
    if (operator === "lte") return t("filterDateOperator_lte");
  }
  switch (operator) {
    case "eq":
      return t("filterOperator_eq");
    case "ne":
      return t("filterOperator_ne");
    case "gt":
      return t("filterOperator_gt");
    case "gte":
      return t("filterOperator_gte");
    case "lt":
      return t("filterOperator_lt");
    case "lte":
      return t("filterOperator_lte");
    case "contains":
      return t("filterOperator_contains");
    case "notContains":
      return t("filterOperator_notContains");
    case "hasPrefix":
      return t("filterOperator_hasPrefix");
    case "hasSuffix":
      return t("filterOperator_hasSuffix");
    case "notHasPrefix":
      return t("filterOperator_notHasPrefix");
    case "notHasSuffix":
      return t("filterOperator_notHasSuffix");
    case "between":
      return t("filterOperator_between");
    case "in":
      return t("filterOperator_in");
    case "nin":
      return t("filterOperator_nin");
    default:
      return operator;
  }
}

export {
  getDefaultFilterOperator,
  BOOLEAN_OPERATORS,
  STRING_OPERATORS,
  DEFAULT_OPERATOR,
  resolveTemporalOperator,
  temporalOperatorsFor,
};
export type { BooleanOperator, StringOperator, NumericTemporalOperator };
