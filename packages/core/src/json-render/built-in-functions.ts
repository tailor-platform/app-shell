import type { ComputedFunction } from "@json-render/core";

/**
 * Built-in $computed functions always available in <RenderJSON>.
 * No `functions` prop required — these are injected automatically.
 *
 * All functions receive `args: Record<string, unknown>` and each arg value
 * may itself be a resolved expression (e.g. another $computed result).
 */
export const builtInFunctions: Record<string, ComputedFunction> = {
  /** Multiply two numbers: { a, b } → number */
  multiply: (args) => Number(args.a ?? 0) * Number(args.b ?? 0),

  /** Add two numbers: { a, b } → number */
  add: (args) => Number(args.a ?? 0) + Number(args.b ?? 0),

  /** Subtract b from a: { a, b } → number */
  subtract: (args) => Number(args.a ?? 0) - Number(args.b ?? 0),

  /** Divide a by b: { a, b } → number | null (returns null when b is 0) */
  divide: (args) => {
    const b = Number(args.b ?? 0);
    return b === 0 ? null : Number(args.a ?? 0) / b;
  },

  /**
   * Format a number as a currency string.
   * { value, currency?: string, locale?: string } → string
   * Defaults: currency = "USD", locale = "en-US"
   */
  formatCurrency: (args) => {
    const value = Number(args.value ?? 0);
    const currency = String(args.currency ?? "USD");
    const locale = String(args.locale ?? "en-US");
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(value);
  },

  /**
   * Format a number with a fixed number of decimal places.
   * { value, decimals?: number } → string
   * Defaults: decimals = 2
   */
  formatNumber: (args) => {
    const value = Number(args.value ?? 0);
    const decimals = args.decimals != null ? Number(args.decimals) : 2;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  /**
   * Format a decimal as a percentage string.
   * { value, decimals?: number } → string  (e.g. 0.1 → "10.0%")
   * Defaults: decimals = 1
   */
  formatPercent: (args) => {
    const value = Number(args.value ?? 0);
    const decimals = args.decimals != null ? Number(args.decimals) : 1;
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  /**
   * Sum an array of numbers: { values: number[] } → number
   * Each element of `values` may itself be a resolved $computed expression.
   */
  sum: (args) => {
    const values = Array.isArray(args.values) ? args.values : [];
    return values.reduce((acc: number, v) => acc + Number(v ?? 0), 0);
  },

  /**
   * Multiply an array of numbers together: { values: number[] } → number
   * Each element of `values` may itself be a resolved $computed expression.
   */
  product: (args) => {
    const values = Array.isArray(args.values) ? args.values : [];
    return values.reduce((acc: number, v) => acc * Number(v ?? 0), 1);
  },
};
