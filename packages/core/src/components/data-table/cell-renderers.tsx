import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/badge";
import type {
  BadgeCellOptions,
  BadgeVariant,
  Column,
  DateCellOptions,
  LinkCellOptions,
  MoneyCellOptions,
  NumberCellOptions,
} from "./types";

const PLACEHOLDER = (
  <span className="astw:text-muted-foreground" aria-hidden="true">
    —
  </span>
);

function getCellValue<TRow extends Record<string, unknown>>(row: TRow, col: Column<TRow>): unknown {
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
  if (isEmpty(value)) return PLACEHOLDER;
  return String(value);
}

function renderNumber(value: unknown, options: NumberCellOptions | undefined): ReactNode {
  if (isEmpty(value)) return PLACEHOLDER;
  const num = Number(value);
  if (Number.isNaN(num)) return PLACEHOLDER;
  const min = options?.minDecimals ?? 0;
  const formatted = new Intl.NumberFormat(options?.locale, {
    minimumFractionDigits: min,
    maximumFractionDigits: options?.maxDecimals ?? min,
  }).format(num);
  return <span className="astw:tabular-nums">{formatted}</span>;
}

function renderMoney<TRow extends Record<string, unknown>>(
  value: unknown,
  row: TRow,
  options: MoneyCellOptions<TRow> | undefined,
): ReactNode {
  if (isEmpty(value)) return PLACEHOLDER;
  const num = Number(value);
  if (Number.isNaN(num)) return PLACEHOLDER;
  const currency =
    (typeof options?.currency === "function" ? options.currency(row) : options?.currency) || "USD";

  // `maxDecimals` raises the cap above the currency default while keeping the
  // minimum at the currency default (e.g. 2 for USD). Lets a JPY column stay
  // at 0 decimals while a USD price-detail column shows up to 4.
  const formatOptions: Intl.NumberFormatOptions = { style: "currency", currency };
  if (options?.maxDecimals != null) {
    formatOptions.maximumFractionDigits = options.maxDecimals;
  }
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(options?.locale, formatOptions).format(num);
  } catch {
    // Fall back to USD if the currency code is invalid — Intl throws on bad ISO codes.
    formatted = new Intl.NumberFormat(options?.locale, {
      style: "currency",
      currency: "USD",
    }).format(num);
  }
  return <span className="astw:tabular-nums">{formatted}</span>;
}

function renderDate(value: unknown, options: DateCellOptions | undefined): ReactNode {
  if (isEmpty(value)) return PLACEHOLDER;
  const date = toDate(value);
  if (!date) return PLACEHOLDER;
  const format = options?.dateFormat ?? "short";
  const formatOptions: Intl.DateTimeFormatOptions =
    format === "long"
      ? { month: "long", day: "numeric", year: "numeric" }
      : format === "datetime"
        ? {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }
        : { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat(options?.locale, formatOptions).format(date);
}

function renderBadge(value: unknown, options: BadgeCellOptions | undefined): ReactNode {
  if (isEmpty(value)) return PLACEHOLDER;
  const key = String(value);
  const variant: BadgeVariant =
    options?.badgeVariantMap?.[key] ?? options?.defaultBadgeVariant ?? "neutral";
  const label = options?.badgeLabelMap?.[key] ?? key;
  return <Badge variant={variant}>{label}</Badge>;
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
  const value = getCellValue(row, col);
  switch (col.type) {
    case "number":
      return renderNumber(value, col.typeOptions);
    case "money":
      return renderMoney(value, row, col.typeOptions);
    case "date":
      return renderDate(value, col.typeOptions);
    case "badge":
      return renderBadge(value, col.typeOptions);
    case "link":
      return renderLink(value, row, col.typeOptions);
    case "text":
    default:
      return renderText(value);
  }
}
