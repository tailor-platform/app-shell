import type { ComponentProps, ReactNode } from "react";
import type { BadgeOptions } from "@/components/badge-list";

/** Built-in display renderers, independent of the editor used for the cell. */
export type ColumnCellType = "text" | "number" | "money" | "date" | "badge" | "link";

/** Options for type: "number" cells; display precision never rounds stored values. */
export interface NumberCellOptions {
  /** Minimum decimal places. Default: 0. */
  minDecimals?: number;
  /** Maximum decimal places. Default: minDecimals (or 0). */
  maxDecimals?: number;
  /** BCP 47 locale tag. Defaults to the runtime locale. */
  locale?: string;
}

/** Options for type: "money" cells. */
export interface MoneyCellOptions<TRow extends Record<string, unknown>> {
  /** ISO 4217 currency code, fixed or read from the row. Default: USD. */
  currency?: string | ((row: TRow) => string);
  /** Raises the maximum above currency precision while retaining its default minimum. */
  maxDecimals?: number;
  /** BCP 47 locale tag. Defaults to the runtime locale. */
  locale?: string;
}

/** Options for type: "date" cells. */
export interface DateCellOptions {
  /** Short date, long date or date and time. Default: short. */
  dateFormat?: "short" | "long" | "datetime";
  /** BCP 47 locale tag. Defaults to the runtime locale. */
  locale?: string;
}

/** Options for type: "badge" cells. */
export interface BadgeCellOptions extends BadgeOptions {
  /** Maximum visible badges before a +N overflow indicator. */
  maxVisible?: number;
}

/** Options for type: "link" cells; href is required. */
export interface LinkCellOptions<TRow extends Record<string, unknown>> {
  /** Returning null or undefined displays plain text rather than a link. */
  href: (row: TRow) => string | null | undefined;
}

export type HeaderRenderContext =
  | { label?: string; sortable: false }
  | {
      label?: string;
      sortable: true;
      sortDirection: "Asc" | "Desc" | undefined;
      activateSort: () => void;
    };

export interface FooterRenderContext<TRow extends Record<string, unknown>> {
  /** Logical rows chosen by the adapter, never just the virtualized DOM window. */
  rows: readonly TRow[];
}

export interface ColumnDisplayProps<TRow extends Record<string, unknown>> {
  label?: string;
  render?: (row: TRow) => ReactNode;
  header?: (ctx: HeaderRenderContext) => ReactNode;
  headerProps?: (
    ctx: HeaderRenderContext,
  ) => Pick<ComponentProps<"th">, "className" | "style" | "title"> | undefined;
  cellProps?: (
    row: TRow,
  ) => Pick<ComponentProps<"td">, "className" | "style" | "title"> | undefined;
  footer?: string | ((ctx: FooterRenderContext<TRow>) => ReactNode);
  footerProps?: (
    ctx: FooterRenderContext<TRow>,
  ) => Pick<ComponentProps<"td">, "className" | "style" | "title"> | undefined;
  /** Pixels, equal-share flex, or intrinsic auto width when omitted. */
  width?: number | "flex";
  /** Explicit pinning is not automatically removed in a narrow viewport. */
  pin?: "left" | "right";
  align?: "left" | "center" | "right";
  /** true and {} use primitive formatted display, never an implicit raw-value fallback. */
  truncate?:
    | boolean
    | {
        tooltip?: false | ((ctx: { row: TRow; display: ReactNode }) => ReactNode);
      };
}

/** Renderer inputs and options, independent of how a component obtains or edits a value. */
export interface ColumnDisplayTypes<TRow extends Record<string, unknown>> {
  text: {
    value: string | number | boolean | bigint | null | undefined;
    options: never;
  };
  number: { value: number | null | undefined; options: NumberCellOptions };
  money: { value: number | null | undefined; options: MoneyCellOptions<TRow> };
  date: { value: Date | string | number | null | undefined; options: DateCellOptions };
  badge: {
    value: string | string[] | number | boolean | null | undefined;
    options: BadgeCellOptions;
  };
  link: {
    value: string | number | boolean | null | undefined;
    options: LinkCellOptions<TRow>;
  };
}

type DisplayOptions<
  TRow extends Record<string, unknown>,
  K extends ColumnCellType,
> = K extends "link"
  ? { typeOptions: ColumnDisplayTypes<TRow>[K]["options"] }
  : { typeOptions?: ColumnDisplayTypes<TRow>[K]["options"] };

export type TypedColumnDisplay<TRow extends Record<string, unknown>, K extends ColumnCellType> = {
  type: K;
} & DisplayOptions<TRow, K>;

export type ColumnDisplay<TRow extends Record<string, unknown>, TValue> =
  | { type?: undefined; typeOptions?: never }
  | {
      [K in ColumnCellType]: [TValue] extends [ColumnDisplayTypes<TRow>[K]["value"]]
        ? TypedColumnDisplay<TRow, K>
        : never;
    }[ColumnCellType];
