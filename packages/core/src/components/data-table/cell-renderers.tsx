import type { ReactNode } from "react";
import { Link } from "react-router";
import { Popover } from "@base-ui/react/popover";
import { Badge } from "@/components/badge";
import { resolveBadgeVariant, resolveBadgeLabel } from "@/components/badge-utils";
import type {
  BadgeCellOptions,
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
  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
  };
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

  const values = Array.isArray(value) ? value : [value];
  if (values.every((v) => isEmpty(v))) return PLACEHOLDER;

  const maxVisible = options?.maxVisible;
  const nonEmpty = values.filter((v) => !isEmpty(v));
  const visible = maxVisible != null ? nonEmpty.slice(0, maxVisible) : nonEmpty;
  const overflow = maxVisible != null ? nonEmpty.slice(maxVisible) : [];

  const renderSingleBadge = (raw: unknown, i: number) => {
    const key = String(raw);
    const variant = resolveBadgeVariant(key, options);
    const label = resolveBadgeLabel(key, options) ?? key;
    return (
      <Badge key={i} variant={variant}>
        {label}
      </Badge>
    );
  };

  // Single badge without array — simple path
  if (visible.length === 1 && overflow.length === 0) {
    return renderSingleBadge(visible[0], 0);
  }

  return (
    <div className="astw:flex astw:flex-wrap astw:gap-1">
      {visible.map((raw, i) => renderSingleBadge(raw, i))}
      {overflow.length > 0 && (
        <Popover.Root>
          <Popover.Trigger className="astw:cursor-default astw:rounded-md astw:px-2 astw:py-0.5 astw:text-xs astw:font-medium astw:text-muted-foreground astw:hover:bg-muted astw:transition-colors">
            +{overflow.length}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={4} side="bottom" align="start">
              <Popover.Popup className="astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:origin-(--transform-origin) astw:rounded-md astw:border astw:p-2 astw:shadow-md astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95">
                <div className="astw:flex astw:flex-wrap astw:gap-1">
                  {overflow.map((raw, i) => renderSingleBadge(raw, i))}
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
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
