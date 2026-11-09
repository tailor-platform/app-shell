/** Pure input parsing; business validation, normalization and adoption belong to the adapter. */

// Thousands grouping with commas, e.g. "1,234,567.89".
const GROUPED_NUMBER = /^-?\d{1,3}(?:,\d{3})+(?:\.\d*)?$/;

/**
 * Cleans number text before it's checked: full-width digits and signs become
 * ASCII, whitespace and currency symbols are dropped, and commas are removed
 * only when they form strict thousands groups — so "1,234.5" becomes "1234.5",
 * while "1,5" is left alone to fail instead of silently turning into 15.
 */
export function normalizeNumberText(text: string): string {
  const compact = text
    .normalize("NFKC")
    .replace(/[\s\p{Sc}]/gu, "")
    .replace(/^−/, "-");
  return GROUPED_NUMBER.test(compact) ? compact.replace(/,/g, "") : compact;
}

/** `""` → `null`, `"5."` → `5`; `"-"`, `"."` and anything non-numeric → `undefined`. */
export function parseNumberText(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return undefined;
  // `+ 0` folds -0 into 0 so "-0" doesn't read as a change from 0.
  return value + 0;
}

/** Reads a raw numeric value; invalid and empty values are represented by null. */
export function toNumberValue(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Reads a raw cell value as text; `null`, `undefined` and `""` are all empty. */
export function toTextValue(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  return String(raw);
}

/** Compare parsed values exactly; rounding belongs to the consumer. */
export function sameNumber(a: number | null, b: number | null): boolean {
  return a === b;
}

/** Plain edit text preserves the value without grouping or exponent notation. */
export function toNumberEditText(value: number | null): string {
  if (value === null) return "";
  return value.toLocaleString("en-US", {
    useGrouping: false,
    maximumSignificantDigits: 21,
  });
}
