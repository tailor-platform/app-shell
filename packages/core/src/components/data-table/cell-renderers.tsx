import type { ReactNode } from "react";
import { Link } from "react-router";
import { BadgeList, toValueArray } from "@/components/badge-list";
import { currencyFractionDigits } from "./cell-edit";
import type {
  BadgeCellOptions,
  Column,
  DateCellOptions,
  LinkCellOptions,
  MoneyCellOptions,
  NumberCellOptions,
} from "./types";

function resolveDateFormatOptions(format: string): Intl.DateTimeFormatOptions {
  if (format === "long") return { month: "long", day: "numeric", year: "numeric" };
  if (format === "datetime") {
    return {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };
  }
  return { month: "short", day: "numeric", year: "numeric" };
}

const PLACEHOLDER = (
  <span className="astw:text-muted-foreground" aria-hidden="true">
    —
  </span>
);

/**
 * Read the raw cell value for a column. Used by the built-in `type`
 * renderers and by `truncate`'s tooltip so they share one precedence
 * rule: explicit `accessor` wins, otherwise fall back to `row[col.id]`
 * when `id` is set.
 *
 * @internal
 */
export function getCellValue<TRow extends Record<string, unknown>>(
  row: TRow,
  col: Column<TRow>,
): unknown {
  if (col.accessor) return col.accessor(row);
  if (col.id) return row[col.id];
  return undefined;
}

function isEmpty(value: unknown): boolean {
  return value == null || value === "";
}

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function renderText(value: unknown): ReactNode {
  switch (true) {
    case isEmpty(value):
      return PLACEHOLDER;
    case typeof value === "boolean":
      return value ? "✓" : "✗";
    case value instanceof Date:
      return value.toLocaleDateString();
    case typeof value === "object":
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

// `editMaxDecimals` is the column's `edit.maxDecimals`: an editable column
// displays as many decimals as its editor accepts, so a typed 2.5 never reads
// back as "3". The cap never drops below `minDecimals`, which Intl rejects
// with a RangeError.
function formatNumber(
  num: number,
  options: NumberCellOptions | undefined,
  editMaxDecimals: number | undefined,
): string {
  const min = options?.minDecimals ?? 0;
  return new Intl.NumberFormat(options?.locale, {
    minimumFractionDigits: min,
    maximumFractionDigits: Math.max(min, options?.maxDecimals ?? min, editMaxDecimals ?? 0),
  }).format(num);
}

function renderNumber(
  value: unknown,
  options: NumberCellOptions | undefined,
  editMaxDecimals: number | undefined,
): ReactNode {
  if (isEmpty(value)) return PLACEHOLDER;
  const num = Number(value);
  if (Number.isNaN(num)) return PLACEHOLDER;
  return <span className="astw:tabular-nums">{formatNumber(num, options, editMaxDecimals)}</span>;
}

/**
 * The ISO 4217 code a `money` column uses for a row. Default: `"USD"`.
 *
 * @internal
 */
export function resolveMoneyCurrency<TRow extends Record<string, unknown>>(
  options: MoneyCellOptions<TRow> | undefined,
  row: TRow,
): string {
  return (
    (typeof options?.currency === "function" ? options.currency(row) : options?.currency) || "USD"
  );
}

function formatMoney<TRow extends Record<string, unknown>>(
  num: number,
  row: TRow,
  options: MoneyCellOptions<TRow> | undefined,
  editMaxDecimals: number | undefined,
): string {
  const currency = resolveMoneyCurrency(options, row);

  // `maxDecimals` raises the cap above the currency default while keeping the
  // minimum at the currency default (e.g. 2 for USD). Lets a JPY column stay
  // at 0 decimals while a USD price-detail column shows up to 4. An editable
  // column's `edit.maxDecimals` raises it the same way, but never lowers it.
  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
  };
  const editCap = editMaxDecimals ?? 0;
  if (options?.maxDecimals != null || editCap > currencyFractionDigits(currency)) {
    formatOptions.maximumFractionDigits = Math.max(options?.maxDecimals ?? 0, editCap);
  }
  try {
    return new Intl.NumberFormat(options?.locale, formatOptions).format(num);
  } catch {
    // Fall back to USD if the currency code is invalid — Intl throws on bad ISO codes.
    return new Intl.NumberFormat(options?.locale, {
      style: "currency",
      currency: "USD",
    }).format(num);
  }
}

function renderMoney<TRow extends Record<string, unknown>>(
  value: unknown,
  row: TRow,
  options: MoneyCellOptions<TRow> | undefined,
  editMaxDecimals: number | undefined,
): ReactNode {
  if (isEmpty(value)) return PLACEHOLDER;
  const num = Number(value);
  if (Number.isNaN(num)) return PLACEHOLDER;
  return (
    <span className="astw:tabular-nums">{formatMoney(num, row, options, editMaxDecimals)}</span>
  );
}

/**
 * Formats a bare number the way a `number` / `money` column displays it. Used
 * for the bounds in inline-editing messages ("Must be $1,000.00 or less").
 *
 * @internal
 */
export function formatColumnNumber<TRow extends Record<string, unknown>>(
  row: TRow,
  col: Column<TRow>,
  value: number,
): string {
  if (col.type === "money") return formatMoney(value, row, col.typeOptions, col.edit?.maxDecimals);
  if (col.type === "number") return formatNumber(value, col.typeOptions, col.edit?.maxDecimals);
  return String(value);
}

function renderDate(value: unknown, options: DateCellOptions | undefined): ReactNode {
  if (isEmpty(value)) return PLACEHOLDER;
  const date = toDate(value);
  if (!date) return PLACEHOLDER;
  const format = options?.dateFormat ?? "short";
  const formatOptions = resolveDateFormatOptions(format);
  return new Intl.DateTimeFormat(options?.locale, formatOptions).format(date);
}

function renderBadge(value: unknown, options: BadgeCellOptions | undefined): ReactNode {
  const items = toValueArray(value);
  const nonEmpty = items.filter((v) => v != null && v !== "");
  if (nonEmpty.length === 0) return PLACEHOLDER;
  return <BadgeList value={value} options={options} maxVisible={options?.maxVisible} />;
}

function renderLink<TRow extends Record<string, unknown>>(
  value: unknown,
  row: TRow,
  options: LinkCellOptions<TRow>,
): ReactNode {
  if (isEmpty(value)) return PLACEHOLDER;
  const label = String(value);
  const href = options.href(row);
  if (!href) return label;
  return (
    <Link to={href} className="astw:text-primary astw:underline-offset-4 astw:hover:underline">
      {label}
    </Link>
  );
}

/**
 * Render a cell using the column's built-in `type`. Callers should prefer
 * `col.render` when it is defined.
 *
 * @internal
 */
export function renderTypedCell<TRow extends Record<string, unknown>>(
  row: TRow,
  col: Column<TRow>,
): ReactNode {
  return renderTypedValue(row, col, getCellValue(row, col));
}

/**
 * Render `value` with the column's built-in `type` renderer. Editable cells use
 * it to show a save that is still in flight before the new value reaches
 * `data`, and pass `linkAsText` because a `link` cell that can be edited is an
 * input, not a link.
 *
 * @internal
 */
export function renderTypedValue<TRow extends Record<string, unknown>>(
  row: TRow,
  col: Column<TRow>,
  value: unknown,
  options?: { linkAsText?: boolean },
): ReactNode {
  switch (col.type) {
    case "number":
      return renderNumber(value, col.typeOptions, col.edit?.maxDecimals);
    case "money":
      return renderMoney(value, row, col.typeOptions, col.edit?.maxDecimals);
    case "date":
      return renderDate(value, col.typeOptions);
    case "badge":
      return renderBadge(value, col.typeOptions);
    case "link":
      return options?.linkAsText ? renderText(value) : renderLink(value, row, col.typeOptions);
    case "text":
    default:
      return renderText(value);
  }
}
