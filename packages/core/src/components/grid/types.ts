import type * as React from "react";

// ============================================================================
// GRID TYPES
// ============================================================================

/**
 * Responsive breakpoints, aligned with Tailwind's default breakpoints.
 * `initial` is the base (mobile-first) value applied below the `sm` breakpoint.
 */
export type Breakpoint = "initial" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * A value that can either be a single value applied at all breakpoints, or an
 * object keyed by breakpoint for responsive behavior.
 *
 * @example
 * ```tsx
 * columns={4}                          // same at every breakpoint
 * columns={{ initial: 1, md: 2, xl: 4 }} // responsive
 * ```
 */
export type Responsive<T> = T | Partial<Record<Breakpoint, T>>;

/**
 * Props for the {@link Grid} component.
 *
 * `Grid` is a generic, presentational CSS-Grid container. It does not assume
 * any data shape — children flow into the tracks defined by `columns`/`rows`.
 */
export interface GridProps extends React.ComponentProps<"div"> {
  /**
   * Column tracks. A number creates that many equal columns
   * (`repeat(n, minmax(0, 1fr))`); a string is used verbatim as a
   * `grid-template-columns` value (e.g. `"280px 1fr"`). Responsive.
   */
  columns?: Responsive<number | string>;
  /**
   * Row tracks. A number creates that many equal rows
   * (`repeat(n, minmax(0, 1fr))`); a string is used verbatim as a
   * `grid-template-rows` value. Responsive.
   */
  rows?: Responsive<number | string>;
  /**
   * Gap between rows and columns, in spacing-scale units (`4` = `1rem`).
   * Defaults to `3` (12px). Responsive.
   */
  gap?: Responsive<number>;
  /** Horizontal (column) gap override, in spacing-scale units. Responsive. */
  gapX?: Responsive<number>;
  /** Vertical (row) gap override, in spacing-scale units. Responsive. */
  gapY?: Responsive<number>;
  /**
   * Auto-fit columns: each child is at least this wide and as many as fit are
   * placed per row (`repeat(auto-fit, minmax(w, 1fr))`). A number is treated as
   * pixels. **Overrides `columns`** when set.
   */
  minChildWidth?: number | string;
  /** `grid-auto-flow` direction. */
  flow?: "row" | "column" | "dense" | "row-dense" | "column-dense";
  /** `align-items` — block-axis alignment of children within their tracks. */
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  /** `justify-content` — inline-axis distribution of tracks within the grid. */
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
}

/**
 * Props for {@link Grid.Item} — a grid cell that spans or is placed explicitly.
 *
 * Only needed when a child must span multiple tracks or be positioned; plain
 * children render in a single cell without it.
 */
export interface GridItemProps extends React.ComponentProps<"div"> {
  /** Number of columns to span, or `"full"` to span all columns. Responsive. */
  colSpan?: Responsive<number | "full">;
  /** Number of rows to span, or `"full"` to span all rows. Responsive. */
  rowSpan?: Responsive<number | "full">;
  /** 1-based column line to start at (`grid-column-start`). Responsive. */
  colStart?: Responsive<number>;
  /** 1-based column line to end at (`grid-column-end`). Responsive. */
  colEnd?: Responsive<number>;
}
