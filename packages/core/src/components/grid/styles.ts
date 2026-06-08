import type * as React from "react";
import type { Breakpoint, GridItemProps, GridProps, Responsive } from "./types";

// ============================================================================
// Grid style resolution
//
// Dynamic grid templates can't be expressed as static Tailwind utilities, so —
// like `Layout` does with `--layout-cols` — we set CSS custom properties in
// `style` and consume them through fixed arbitrary-value utilities. The class
// strings below MUST be written as literals so Tailwind's compiler can see them
// and emit the corresponding CSS into the shipped stylesheet.
// ============================================================================

const BREAKPOINTS: Breakpoint[] = ["initial", "sm", "md", "lg", "xl", "2xl"];

/** The CSS variables and utility classes resolved for an element. */
interface ResolvedStyles {
  vars: Record<string, string>;
  classes: string[];
}

/** Normalize a `Responsive<T>` prop into a breakpoint-keyed map. */
function toResponsiveMap<T>(value: Responsive<T> | undefined): Partial<Record<Breakpoint, T>> {
  if (value === undefined || value === null) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Partial<Record<Breakpoint, T>>;
  }
  return { initial: value as T };
}

/**
 * For each present breakpoint, set its CSS variable to the resolved value and
 * push the matching utility class. Mutates `out`.
 */
function applyResponsive<T>(
  value: Responsive<T> | undefined,
  varMap: Record<Breakpoint, string>,
  classMap: Record<Breakpoint, string>,
  toCss: (v: T) => string,
  out: ResolvedStyles,
): void {
  const map = toResponsiveMap(value);
  for (const bp of BREAKPOINTS) {
    const v = map[bp];
    if (v === undefined) continue;
    out.vars[varMap[bp]] = toCss(v);
    out.classes.push(classMap[bp]);
  }
}

// --- value → CSS converters -------------------------------------------------

const trackTemplate = (v: number | string): string =>
  typeof v === "number" ? `repeat(${v}, minmax(0, 1fr))` : v;

const gapValue = (n: number): string => `calc(var(--spacing, 0.25rem) * ${n})`;

const spanValue = (v: number | "full"): string =>
  v === "full" ? "1 / -1" : `span ${v} / span ${v}`;

const lineValue = (n: number): string => String(n);

// --- Grid container maps ----------------------------------------------------

const COLS_VAR: Record<Breakpoint, string> = {
  initial: "--grid-cols",
  sm: "--grid-cols-sm",
  md: "--grid-cols-md",
  lg: "--grid-cols-lg",
  xl: "--grid-cols-xl",
  "2xl": "--grid-cols-2xl",
};
const COLS_CLASS: Record<Breakpoint, string> = {
  initial: "astw:grid-cols-[var(--grid-cols)]",
  sm: "astw:sm:grid-cols-[var(--grid-cols-sm)]",
  md: "astw:md:grid-cols-[var(--grid-cols-md)]",
  lg: "astw:lg:grid-cols-[var(--grid-cols-lg)]",
  xl: "astw:xl:grid-cols-[var(--grid-cols-xl)]",
  "2xl": "astw:2xl:grid-cols-[var(--grid-cols-2xl)]",
};

const ROWS_VAR: Record<Breakpoint, string> = {
  initial: "--grid-rows",
  sm: "--grid-rows-sm",
  md: "--grid-rows-md",
  lg: "--grid-rows-lg",
  xl: "--grid-rows-xl",
  "2xl": "--grid-rows-2xl",
};
const ROWS_CLASS: Record<Breakpoint, string> = {
  initial: "astw:grid-rows-[var(--grid-rows)]",
  sm: "astw:sm:grid-rows-[var(--grid-rows-sm)]",
  md: "astw:md:grid-rows-[var(--grid-rows-md)]",
  lg: "astw:lg:grid-rows-[var(--grid-rows-lg)]",
  xl: "astw:xl:grid-rows-[var(--grid-rows-xl)]",
  "2xl": "astw:2xl:grid-rows-[var(--grid-rows-2xl)]",
};

const GAPX_VAR: Record<Breakpoint, string> = {
  initial: "--grid-gap-x",
  sm: "--grid-gap-x-sm",
  md: "--grid-gap-x-md",
  lg: "--grid-gap-x-lg",
  xl: "--grid-gap-x-xl",
  "2xl": "--grid-gap-x-2xl",
};
const GAPX_CLASS: Record<Breakpoint, string> = {
  initial: "astw:gap-x-[var(--grid-gap-x)]",
  sm: "astw:sm:gap-x-[var(--grid-gap-x-sm)]",
  md: "astw:md:gap-x-[var(--grid-gap-x-md)]",
  lg: "astw:lg:gap-x-[var(--grid-gap-x-lg)]",
  xl: "astw:xl:gap-x-[var(--grid-gap-x-xl)]",
  "2xl": "astw:2xl:gap-x-[var(--grid-gap-x-2xl)]",
};

const GAPY_VAR: Record<Breakpoint, string> = {
  initial: "--grid-gap-y",
  sm: "--grid-gap-y-sm",
  md: "--grid-gap-y-md",
  lg: "--grid-gap-y-lg",
  xl: "--grid-gap-y-xl",
  "2xl": "--grid-gap-y-2xl",
};
const GAPY_CLASS: Record<Breakpoint, string> = {
  initial: "astw:gap-y-[var(--grid-gap-y)]",
  sm: "astw:sm:gap-y-[var(--grid-gap-y-sm)]",
  md: "astw:md:gap-y-[var(--grid-gap-y-md)]",
  lg: "astw:lg:gap-y-[var(--grid-gap-y-lg)]",
  xl: "astw:xl:gap-y-[var(--grid-gap-y-xl)]",
  "2xl": "astw:2xl:gap-y-[var(--grid-gap-y-2xl)]",
};

const FLOW_CLASS: Record<NonNullable<GridProps["flow"]>, string> = {
  row: "astw:grid-flow-row",
  column: "astw:grid-flow-col",
  dense: "astw:grid-flow-dense",
  "row-dense": "astw:grid-flow-row-dense",
  "column-dense": "astw:grid-flow-col-dense",
};

const ALIGN_CLASS: Record<NonNullable<GridProps["align"]>, string> = {
  start: "astw:items-start",
  center: "astw:items-center",
  end: "astw:items-end",
  stretch: "astw:items-stretch",
  baseline: "astw:items-baseline",
};

const JUSTIFY_CLASS: Record<NonNullable<GridProps["justify"]>, string> = {
  start: "astw:justify-start",
  center: "astw:justify-center",
  end: "astw:justify-end",
  between: "astw:justify-between",
  around: "astw:justify-around",
  evenly: "astw:justify-evenly",
};

// --- Grid.Item maps (arbitrary properties consuming CSS vars) ---------------

const ITEM_COL_VAR: Record<Breakpoint, string> = {
  initial: "--gi-col",
  sm: "--gi-col-sm",
  md: "--gi-col-md",
  lg: "--gi-col-lg",
  xl: "--gi-col-xl",
  "2xl": "--gi-col-2xl",
};
const ITEM_COL_CLASS: Record<Breakpoint, string> = {
  initial: "astw:[grid-column:var(--gi-col)]",
  sm: "astw:sm:[grid-column:var(--gi-col-sm)]",
  md: "astw:md:[grid-column:var(--gi-col-md)]",
  lg: "astw:lg:[grid-column:var(--gi-col-lg)]",
  xl: "astw:xl:[grid-column:var(--gi-col-xl)]",
  "2xl": "astw:2xl:[grid-column:var(--gi-col-2xl)]",
};

const ITEM_ROW_VAR: Record<Breakpoint, string> = {
  initial: "--gi-row",
  sm: "--gi-row-sm",
  md: "--gi-row-md",
  lg: "--gi-row-lg",
  xl: "--gi-row-xl",
  "2xl": "--gi-row-2xl",
};
const ITEM_ROW_CLASS: Record<Breakpoint, string> = {
  initial: "astw:[grid-row:var(--gi-row)]",
  sm: "astw:sm:[grid-row:var(--gi-row-sm)]",
  md: "astw:md:[grid-row:var(--gi-row-md)]",
  lg: "astw:lg:[grid-row:var(--gi-row-lg)]",
  xl: "astw:xl:[grid-row:var(--gi-row-xl)]",
  "2xl": "astw:2xl:[grid-row:var(--gi-row-2xl)]",
};

const ITEM_COLSTART_VAR: Record<Breakpoint, string> = {
  initial: "--gi-col-start",
  sm: "--gi-col-start-sm",
  md: "--gi-col-start-md",
  lg: "--gi-col-start-lg",
  xl: "--gi-col-start-xl",
  "2xl": "--gi-col-start-2xl",
};
const ITEM_COLSTART_CLASS: Record<Breakpoint, string> = {
  initial: "astw:[grid-column-start:var(--gi-col-start)]",
  sm: "astw:sm:[grid-column-start:var(--gi-col-start-sm)]",
  md: "astw:md:[grid-column-start:var(--gi-col-start-md)]",
  lg: "astw:lg:[grid-column-start:var(--gi-col-start-lg)]",
  xl: "astw:xl:[grid-column-start:var(--gi-col-start-xl)]",
  "2xl": "astw:2xl:[grid-column-start:var(--gi-col-start-2xl)]",
};

const ITEM_COLEND_VAR: Record<Breakpoint, string> = {
  initial: "--gi-col-end",
  sm: "--gi-col-end-sm",
  md: "--gi-col-end-md",
  lg: "--gi-col-end-lg",
  xl: "--gi-col-end-xl",
  "2xl": "--gi-col-end-2xl",
};
const ITEM_COLEND_CLASS: Record<Breakpoint, string> = {
  initial: "astw:[grid-column-end:var(--gi-col-end)]",
  sm: "astw:sm:[grid-column-end:var(--gi-col-end-sm)]",
  md: "astw:md:[grid-column-end:var(--gi-col-end-md)]",
  lg: "astw:lg:[grid-column-end:var(--gi-col-end-lg)]",
  xl: "astw:xl:[grid-column-end:var(--gi-col-end-xl)]",
  "2xl": "astw:2xl:[grid-column-end:var(--gi-col-end-2xl)]",
};

// --- Resolvers --------------------------------------------------------------

type GridStyleProps = Pick<
  GridProps,
  "columns" | "rows" | "gap" | "gapX" | "gapY" | "minChildWidth" | "flow" | "align" | "justify"
>;

/** Resolve the container's CSS variables, utility classes, and inline style. */
export function resolveGridStyles({
  columns,
  rows,
  gap,
  gapX,
  gapY,
  minChildWidth,
  flow,
  align,
  justify,
}: GridStyleProps): ResolvedStyles & { minChildStyle?: React.CSSProperties } {
  const out: ResolvedStyles = { vars: {}, classes: [] };

  // `minChildWidth` (auto-fit) is applied as an inline template and takes
  // precedence over `columns`.
  const usingMinChild = minChildWidth !== undefined;
  if (!usingMinChild) {
    applyResponsive(columns, COLS_VAR, COLS_CLASS, trackTemplate, out);
  }
  applyResponsive(rows, ROWS_VAR, ROWS_CLASS, trackTemplate, out);
  applyResponsive(gapX ?? gap, GAPX_VAR, GAPX_CLASS, gapValue, out);
  applyResponsive(gapY ?? gap, GAPY_VAR, GAPY_CLASS, gapValue, out);

  if (flow) out.classes.push(FLOW_CLASS[flow]);
  if (align) out.classes.push(ALIGN_CLASS[align]);
  if (justify) out.classes.push(JUSTIFY_CLASS[justify]);

  const minChildStyle = usingMinChild
    ? {
        gridTemplateColumns: `repeat(auto-fit, minmax(${
          typeof minChildWidth === "number" ? `${minChildWidth}px` : minChildWidth
        }, 1fr))`,
      }
    : undefined;

  return { ...out, minChildStyle };
}

type GridItemStyleProps = Pick<GridItemProps, "colSpan" | "rowSpan" | "colStart" | "colEnd">;

/** Resolve a cell's CSS variables and utility classes. */
export function resolveGridItemStyles({
  colSpan,
  rowSpan,
  colStart,
  colEnd,
}: GridItemStyleProps): ResolvedStyles {
  const out: ResolvedStyles = { vars: {}, classes: [] };
  applyResponsive(colSpan, ITEM_COL_VAR, ITEM_COL_CLASS, spanValue, out);
  applyResponsive(rowSpan, ITEM_ROW_VAR, ITEM_ROW_CLASS, spanValue, out);
  applyResponsive(colStart, ITEM_COLSTART_VAR, ITEM_COLSTART_CLASS, lineValue, out);
  applyResponsive(colEnd, ITEM_COLEND_VAR, ITEM_COLEND_CLASS, lineValue, out);
  return out;
}
