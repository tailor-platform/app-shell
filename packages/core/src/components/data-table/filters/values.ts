import type { FilterConfig, FilterOperator } from "@/types/collection";
import type { useDataTableT } from "../i18n";
import {
  isTemporalFilterType,
  isTemporalFilterValueValid,
  normalizeTemporalFilterValue,
} from "@/lib/temporal-filter-values";

const DECIMAL_RE = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/;

export function isDecimalFilterValueValid(value: string): boolean {
  return DECIMAL_RE.test(value.trim());
}

function decimalParts(value: string) {
  const match = DECIMAL_RE.exec(value.trim());
  if (!match) return undefined;
  const fraction = match[3] ?? match[4] ?? "";
  const digits = `${match[2] ?? ""}${fraction}`.replace(/^0+/, "");
  const sign = match[1] === "-" ? -1 : 1;
  return {
    digits,
    sign: digits === "" ? 0 : sign,
    magnitude: BigInt(digits.length - fraction.length) + BigInt(match[5] ?? "0"),
  };
}

export function isDecimalRangeOrdered(min: string, max: string): boolean {
  const lower = decimalParts(min);
  const upper = decimalParts(max);
  if (!lower || !upper) return false;
  if (lower.sign !== upper.sign) return lower.sign < upper.sign;
  if (lower.sign === 0) return true;

  // Compare magnitude, then significant digits, without rounding or expanding exponents.
  if (lower.magnitude !== upper.magnitude) {
    return lower.sign === 1 ? lower.magnitude < upper.magnitude : lower.magnitude > upper.magnitude;
  }
  const width = Math.max(lower.digits.length, upper.digits.length);
  const left = lower.digits.padEnd(width, "0");
  const right = upper.digits.padEnd(width, "0");
  return lower.sign === 1 ? left <= right : left >= right;
}

type AddFilterDraftValue = string | string[];

/**
 * Validation message for a "between" range when the bounds are reversed
 * (max < min). Returns undefined until both bounds are present and individually
 * valid, so it only appears once there's a genuine ordering problem.
 */
function betweenOrderError(
  type: FilterConfig["type"],
  min: string,
  max: string,
  minLabel: string,
  maxLabel: string,
  t: ReturnType<typeof useDataTableT>,
  timeZone?: string,
): string | undefined {
  if (min.trim() === "" || max.trim() === "") return undefined;
  let bothValid = true;
  if (type === "number") {
    bothValid = !Number.isNaN(Number(min)) && !Number.isNaN(Number(max));
  } else if (type === "decimal") {
    bothValid = isDecimalFilterValueValid(min) && isDecimalFilterValueValid(max);
  } else if (isTemporalFilterType(type)) {
    bothValid =
      isTemporalFilterValueValid(type, min, timeZone) &&
      isTemporalFilterValueValid(type, max, timeZone);
  }
  if (!bothValid) return undefined;
  if (isRangeOrdered(type, min, max)) return undefined;
  return t("filterBetweenOrderError", { min: minLabel, max: maxLabel });
}

// =============================================================================
// Helpers
// =============================================================================

function isAddFilterDraftValueValid(
  type: FilterConfig["type"],
  operator: FilterOperator,
  value: AddFilterDraftValue,
  timeZone?: string,
): boolean {
  if (type === "enum") {
    return Array.isArray(value) && value.length > 0;
  }
  if (type === "boolean") {
    return value === "true" || value === "false";
  }

  if (operator === "between") {
    if (!Array.isArray(value)) return false;
    const [min, max] = value;
    const minEmpty = !min || min.trim() === "";
    const maxEmpty = !max || max.trim() === "";
    if (minEmpty || maxEmpty) return false; // both required
    if (type === "number") {
      return !Number.isNaN(Number(min)) && !Number.isNaN(Number(max));
    }
    if (type === "decimal") {
      return isDecimalFilterValueValid(min) && isDecimalFilterValueValid(max);
    }
    if (isTemporalFilterType(type)) {
      return (
        isTemporalFilterValueValid(type, min, timeZone) &&
        isTemporalFilterValueValid(type, max, timeZone)
      );
    }
    return true;
  }

  if (typeof value !== "string") return false;
  if (type === "number") {
    if (value.trim() === "") return false;
    return !Number.isNaN(Number(value));
  }
  if (type === "decimal") return isDecimalFilterValueValid(value);
  if (isTemporalFilterType(type)) {
    return isTemporalFilterValueValid(type, value, timeZone);
  }
  return value.trim() !== "";
}

function toAddFilterSubmittedValue(
  type: FilterConfig["type"],
  operator: FilterOperator,
  value: AddFilterDraftValue,
  timeZone?: string,
): unknown {
  if (type === "enum") {
    return Array.isArray(value) ? (value as string[]) : [];
  }
  if (type === "boolean") {
    return value === "true";
  }

  if (operator === "between" && Array.isArray(value)) {
    const [min, max] = value;
    const trimmedMin = typeof min === "string" ? min.trim() : "";
    const trimmedMax = typeof max === "string" ? max.trim() : "";

    if (type === "number") {
      if (trimmedMin === "" || trimmedMax === "") return undefined;

      const parsedMin = Number(trimmedMin);
      const parsedMax = Number(trimmedMax);
      if (Number.isNaN(parsedMin) || Number.isNaN(parsedMax)) return undefined;

      return { min: parsedMin, max: parsedMax };
    }

    if (trimmedMin === "" || trimmedMax === "") return undefined;

    if (type === "datetime") {
      const normalizedMin = normalizeTemporalFilterValue("datetime", trimmedMin, timeZone);
      const normalizedMax = normalizeTemporalFilterValue("datetime", trimmedMax, timeZone);
      return normalizedMin && normalizedMax
        ? { min: normalizedMin, max: normalizedMax }
        : undefined;
    }

    return {
      min: trimmedMin,
      max: trimmedMax,
    };
  }

  if (type === "number") {
    return Number(value);
  }
  const trimmed = String(value).trim();
  return type === "datetime"
    ? normalizeTemporalFilterValue("datetime", trimmed, timeZone)
    : trimmed;
}

/**
 * Whether a "between" range's bounds are correctly ordered (min ≤ max). Numbers
 * compare numerically; dates and times lexicographically; and datetime instants
 * chronologically. `min === max` is allowed — a valid single-point inclusive range.
 * Assumes both bounds are already individually valid and non-empty.
 */
function isRangeOrdered(type: FilterConfig["type"], min: string, max: string): boolean {
  if (type === "number") return Number(min) <= Number(max);
  if (type === "decimal") return isDecimalRangeOrdered(min, max);
  if (type === "datetime") return new Date(min).getTime() <= new Date(max).getTime();
  if (isTemporalFilterType(type)) return min <= max;
  return true;
}

export { betweenOrderError, isAddFilterDraftValueValid, isRangeOrdered, toAddFilterSubmittedValue };
export type { AddFilterDraftValue };
