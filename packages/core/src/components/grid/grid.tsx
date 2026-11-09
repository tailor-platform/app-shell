import * as React from "react";
import { cn } from "../../lib/utils";
import type { GridItemProps, GridProps } from "./types";
import { resolveGridItemStyles, resolveGridStyles } from "./styles";

/**
 * Grid.Item — a cell within {@link Grid} that spans multiple tracks or is
 * placed at explicit grid lines.
 *
 * Plain children render in a single cell automatically; reach for `Grid.Item`
 * only when you need spanning or explicit placement. All props are responsive.
 *
 * @example
 * ```tsx
 * <Grid columns={4} gap={4}>
 *   <Grid.Item colSpan={2}>Wide card</Grid.Item>
 *   <Card.Root>Normal</Card.Root>
 *   <Grid.Item colSpan={{ initial: "full", md: 1 }} rowSpan={2}>Tall</Grid.Item>
 * </Grid>
 * ```
 */
const Item = React.forwardRef<HTMLDivElement, GridItemProps>(function GridItem(
  { colSpan, rowSpan, colStart, colEnd, className, style, children, ...props },
  ref,
) {
  const { vars, classes } = resolveGridItemStyles({ colSpan, rowSpan, colStart, colEnd });

  return (
    <div
      ref={ref}
      data-slot="grid-item"
      className={cn(classes, className)}
      style={{ ...vars, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
});
Item.displayName = "Grid.Item";

/**
 * Grid — a generic, presentational CSS-Grid container.
 *
 * Arranges children into equal or custom-width columns with responsive reflow.
 * It is purely a layout primitive: it makes no assumptions about the data or
 * domain — children flow into the tracks you define.
 *
 * ### Defining columns
 *
 * - `columns={4}` — four equal columns.
 * - `columns="280px 1fr"` — custom track widths (verbatim `grid-template-columns`).
 * - `columns={{ initial: 1, md: 2, xl: 4 }}` — responsive reflow per breakpoint.
 * - `minChildWidth={240}` — auto-fit: as many ≥240px columns as fit, no breakpoints.
 *
 * ### Spanning
 *
 * Wrap a child in {@link Grid.Item} to span multiple columns/rows. Plain
 * children occupy a single cell.
 *
 * ### Data attributes
 *
 * The root `<div>` has `data-slot="grid"`; `Grid.Item` cells have
 * `data-slot="grid-item"`.
 *
 * @example
 * ```tsx
 * // Responsive KPI grid
 * <Grid columns={{ initial: 1, sm: 2, lg: 4 }} gap={4}>
 *   <Card.Root>…</Card.Root>
 *   <Card.Root>…</Card.Root>
 * </Grid>
 *
 * // Auto-fitting card gallery
 * <Grid minChildWidth={240} gap={6}>
 *   {items.map((i) => <Card.Root key={i.id}>…</Card.Root>)}
 * </Grid>
 * ```
 */
const GridRoot = React.forwardRef<HTMLDivElement, GridProps>(function Grid(
  {
    columns,
    rows,
    gap = 3,
    gapX,
    gapY,
    minChildWidth,
    flow,
    align,
    justify,
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  const { vars, classes, minChildStyle } = resolveGridStyles({
    columns,
    rows,
    gap,
    gapX,
    gapY,
    minChildWidth,
    flow,
    align,
    justify,
  });

  return (
    <div
      ref={ref}
      data-slot="grid"
      className={cn("astw:grid", classes, className)}
      style={{ ...vars, ...minChildStyle, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
});
GridRoot.displayName = "Grid";

export const Grid = Object.assign(GridRoot, { Item });

export type { GridProps, GridItemProps } from "./types";
