import type { BadgeOptions } from "@/components/badge-list";
import type { createDisplayFactories } from "./cell-renderers";

type DisplayFactories<TRow extends Record<string, unknown>> = ReturnType<
  typeof createDisplayFactories<TRow>
>;

/** Built-in display kinds come from their factory definitions. */
export type ColumnCellType = keyof DisplayFactories<Record<string, unknown>>;

/** Options for `type: "number"` cells. */
export interface NumberCellOptions {
  /** Minimum decimal places. Default: `0`. */
  minDecimals?: number;
  /** Maximum decimal places. Default: `minDecimals` (or `0`). */
  maxDecimals?: number;
  /** BCP 47 locale tag. Defaults to the runtime locale. */
  locale?: string;
}

/** Options for `type: "money"` cells. */
export interface MoneyCellOptions<TRow extends Record<string, unknown>> {
  /**
   * ISO 4217 currency code. Pass a string for a static currency or a function
   * to read it from the row. Default: `"USD"`.
   */
  currency?: string | ((row: TRow) => string);
  /**
   * Maximum decimals. Raises the cap above the currency default while keeping
   * the minimum at the currency default (e.g. USD stays at ≥2, but a price
   * column can show up to 4).
   */
  maxDecimals?: number;
  /** BCP 47 locale tag. Defaults to the runtime locale. */
  locale?: string;
}

/** Options for `type: "date"` cells. */
export interface DateCellOptions {
  /**
   * Format style. `"short"` → `Apr 9, 2026`; `"long"` → `April 9, 2026`;
   * `"datetime"` → `Apr 9, 2026, 3:45 PM`. Default: `"short"`.
   */
  dateFormat?: "short" | "long" | "datetime";
  /** BCP 47 locale tag. Defaults to the runtime locale. */
  locale?: string;
}

/** Options for `type: "badge"` cells. */
export interface BadgeCellOptions extends BadgeOptions {
  /** Maximum number of badges to display before showing a "+N" overflow indicator */
  maxVisible?: number;
}

/** Options for `type: "link"` cells. `href` is required. */
export interface LinkCellOptions<TRow extends Record<string, unknown>> {
  /**
   * Extracts the link target. Returning `null` / `undefined` renders the cell
   * value as plain text instead of a link.
   */
  href: (row: TRow) => string | null | undefined;
}

/** Resolved presentation only: no accessor, edit choices, filters, or table state. */
export type ValueDisplayDescriptor<TRow extends Record<string, unknown>> =
  | { type?: undefined; typeOptions?: never }
  | {
      [K in ColumnCellType]: { type: K } & Parameters<DisplayFactories<TRow>[K]>[0];
    }[ColumnCellType];

/** Accepted values are derived from each specialized factory's renderer signature. */
export type ColumnDisplayValues = {
  [K in ColumnCellType]: Parameters<ReturnType<DisplayFactories<Record<string, unknown>>[K]>>[0];
};

export type TypedColumnDisplay<
  TRow extends Record<string, unknown>,
  K extends ColumnCellType,
> = Extract<ValueDisplayDescriptor<TRow>, { type: K }>;

/** A display type must accept the value produced by its column's source. */
export type ColumnDisplay<TRow extends Record<string, unknown>, TValue> =
  | { type?: undefined; typeOptions?: never }
  | {
      [K in ColumnCellType]: [TValue] extends [ColumnDisplayValues[K]]
        ? TypedColumnDisplay<TRow, K>
        : never;
    }[ColumnCellType];
