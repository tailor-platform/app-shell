import type { ReactNode } from "react";
import { parseDate } from "@internationalized/date";
import { Link } from "react-router";
import { BadgeList, toValueArray } from "@/components/badge-list";
import { normalizeTemporalFilterValue } from "@/lib/temporal-filter-values";
import type {
  BadgeCellOptions,
  ColumnCellType,
  DateCellOptions,
  LinkCellOptions,
  MoneyCellOptions,
  NumberCellOptions,
  ValueDisplayDescriptor,
} from "./column-types";

export interface ValueRendererOptions {
  /** Optional, already-resolved display label policy for individual badge values. */
  resolveBadgeLabel?: (value: string) => string;
  /** Keep an editable link's value visible without creating a navigation target. */
  linkAsText?: boolean;
}

const PLACEHOLDER = (
  <span className="astw:text-muted-foreground" aria-hidden="true">
    —
  </span>
);

function isEmpty(value: unknown): boolean {
  return value == null || value === "";
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

  // `maxDecimals` raises the cap above the currency default while retaining its minimum.
  const formatOptions: Intl.NumberFormatOptions = { style: "currency", currency };
  if (options?.maxDecimals != null) formatOptions.maximumFractionDigits = options.maxDecimals;
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(options?.locale, formatOptions).format(num);
  } catch {
    // Invalid currency codes retain the existing USD fallback.
    formatted = new Intl.NumberFormat(options?.locale, {
      style: "currency",
      currency: "USD",
    }).format(num);
  }
  return <span className="astw:tabular-nums">{formatted}</span>;
}

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

function createDateRenderer(
  options: DateCellOptions | undefined,
  timeZone: string,
): (value: unknown) => ReactNode {
  const formatOptions = resolveDateFormatOptions(options?.dateFormat ?? "short");
  let dateOnlyFormatter: Intl.DateTimeFormat | undefined;
  let datetimeFormatter: Intl.DateTimeFormat | undefined;
  return (value) => {
    if (isEmpty(value)) return PLACEHOLDER;
    const dateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
    let date: Date;
    if (dateOnly) {
      // Calendar dates have no instant, even when a timezone skips an entire day.
      try {
        date = parseDate(value.trim()).toDate("UTC");
      } catch {
        return PLACEHOLDER;
      }
    } else {
      const normalized = normalizeTemporalFilterValue("datetime", value, timeZone);
      if (!normalized) return PLACEHOLDER;
      date = new Date(normalized);
    }
    const formatter = dateOnly
      ? (dateOnlyFormatter ??= new Intl.DateTimeFormat(options?.locale, {
          ...formatOptions,
          timeZone: "UTC",
        }))
      : (datetimeFormatter ??= new Intl.DateTimeFormat(options?.locale, {
          ...formatOptions,
          timeZone,
        }));
    return formatter.format(date);
  };
}

function renderBadge(
  value: unknown,
  options: BadgeCellOptions | undefined,
  resolveLabel: ((value: string) => string) | undefined,
): ReactNode {
  if (toValueArray(value).filter((item) => item != null && item !== "").length === 0)
    return PLACEHOLDER;
  return (
    <BadgeList
      value={value}
      options={options}
      maxVisible={options?.maxVisible}
      resolveLabel={resolveLabel}
    />
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

function withAlignment<TFactory extends (...args: never[]) => unknown>(
  align: "left" | "right",
  factory: TFactory,
) {
  return Object.assign(factory, { align });
}

/** Factory signatures define display options and accepted values; metadata owns defaults. */
export function createDisplayFactories<TRow extends Record<string, unknown>>() {
  return {
    text: withAlignment("left", (_config: { typeOptions?: never }) => {
      return (value: string | number | boolean | bigint | null | undefined, _row: TRow) =>
        renderText(value);
    }),
    number: withAlignment("right", (config: { typeOptions?: NumberCellOptions }) => {
      return (value: number | null | undefined, _row: TRow) =>
        renderNumber(value, config.typeOptions);
    }),
    money: withAlignment("right", (config: { typeOptions?: MoneyCellOptions<TRow> }) => {
      return (value: number | null | undefined, row: TRow) =>
        renderMoney(value, row, config.typeOptions);
    }),
    date: withAlignment("left", (config: { typeOptions?: DateCellOptions }, timeZone: string) => {
      const renderDate = createDateRenderer(config.typeOptions, timeZone);
      return (value: Date | string | number | null | undefined, _row: TRow) => renderDate(value);
    }),
    badge: withAlignment(
      "left",
      (
        config: { typeOptions?: BadgeCellOptions },
        _timeZone: string,
        options: ValueRendererOptions,
      ) => {
        return (value: string | string[] | number | boolean | null | undefined, _row: TRow) =>
          renderBadge(value, config.typeOptions, options.resolveBadgeLabel);
      },
    ),
    link: withAlignment(
      "left",
      (
        config: { typeOptions: LinkCellOptions<TRow> },
        _timeZone: string,
        options: ValueRendererOptions,
      ) => {
        return (value: string | number | boolean | null | undefined, row: TRow) =>
          options.linkAsText ? renderText(value) : renderLink(value, row, config.typeOptions);
      },
    ),
  } satisfies Record<string, (...args: never[]) => unknown>;
}

type RuntimeDisplayFactory = {
  (
    config: Record<string, unknown>,
    timeZone: string,
    options: ValueRendererOptions,
  ): (value: unknown, row: Record<string, unknown>) => ReactNode;
  align: "left" | "right";
};

// Only runtime dispatch erases the field-dependent factory signatures.
const displayFactories = createDisplayFactories<Record<string, unknown>>() as unknown as Record<
  ColumnCellType,
  RuntimeDisplayFactory
>;

/** Read layout defaults from the same definitions used to construct display renderers. */
export function getDefaultAlignment(type: ColumnCellType | undefined): "left" | "right" {
  return type !== undefined && Object.hasOwn(displayFactories, type)
    ? displayFactories[type].align
    : "left";
}

/** Build once per display/timezone definition so date formatters are shared across rows. */
export function createValueRenderer<TRow extends Record<string, unknown>>(
  descriptor: ValueDisplayDescriptor<TRow>,
  timeZone: string,
  options: ValueRendererOptions = {},
): (value: unknown, row: TRow) => ReactNode {
  const type = descriptor.type;
  if (type === undefined || !Object.hasOwn(displayFactories, type)) return renderText;
  return displayFactories[type](descriptor, timeZone, options);
}
