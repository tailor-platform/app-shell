---
title: Grid
description: Generic CSS-Grid layout primitive for equal or custom-width columns with responsive reflow, auto-fit, and spanning
---

# Grid

`Grid` is a generic, presentational layout primitive built on CSS Grid. It arranges arbitrary children into equal or custom-width columns, with gap control, responsive reflow, auto-fit sizing, and optional cell spanning via `Grid.Item`. It makes no assumptions about your data — children simply flow into the tracks you define.

> **Grid vs. Layout:** Use [`Layout`](./layout.md) for top-level **page scaffolding** (header + fixed-width sidebars + main content). Use `Grid` for **content grids** within a page — KPI cards, galleries, field groups, dashboards. They are complementary; reach for `Grid` whenever you just need "arrange these N things into columns."

## Import

```tsx
import { Grid } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Grid columns={3} gap={4}>
  <Card.Root>One</Card.Root>
  <Card.Root>Two</Card.Root>
  <Card.Root>Three</Card.Root>
</Grid>
```

Plain children occupy a single cell. Wrap a child in `Grid.Item` only when it needs to span multiple tracks or be placed explicitly.

## Sub-components

| Sub-component | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| `Grid`        | The grid container — defines columns, rows, gap, and alignment         |
| `Grid.Item`   | An optional cell that spans multiple columns/rows or is placed by line |

## Props

### Grid Props

| Prop            | Type                                                                | Default    | Description                                                                                              |
| --------------- | ------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `columns`       | `number \| string \| Responsive<number \| string>`                  | -          | A number creates that many equal columns; a string is a verbatim `grid-template-columns` value           |
| `rows`          | `number \| string \| Responsive<number \| string>`                  | -          | Same shape as `columns`, for `grid-template-rows`                                                        |
| `gap`           | `number \| Responsive<number>`                                      | `3` (12px) | Gap between rows and columns, in spacing-scale units (`4` → `1rem`)                                      |
| `gapX`          | `number \| Responsive<number>`                                      | -          | Horizontal (column) gap override                                                                         |
| `gapY`          | `number \| Responsive<number>`                                      | -          | Vertical (row) gap override                                                                              |
| `minChildWidth` | `number \| string`                                                  | -          | Auto-fit: each item is at least this wide and as many as fit are placed per row. **Overrides `columns`** |
| `flow`          | `"row" \| "column" \| "dense" \| "row-dense" \| "column-dense"`     | `"row"`    | `grid-auto-flow` — placement direction and dense packing                                                 |
| `align`         | `"start" \| "center" \| "end" \| "stretch" \| "baseline"`           | -          | `align-items` — block-axis alignment of items within their tracks                                        |
| `justify`       | `"start" \| "center" \| "end" \| "between" \| "around" \| "evenly"` | -          | `justify-content` — inline-axis distribution of tracks within the grid                                   |
| `className`     | `string`                                                            | -          | Additional CSS classes                                                                                   |
| `children`      | `React.ReactNode`                                                   | -          | Grid items (any elements, or `Grid.Item`)                                                                |

All standard HTML `<div>` props are also accepted.

### Grid.Item Props

| Prop        | Type                                               | Default | Description                                           |
| ----------- | -------------------------------------------------- | ------- | ----------------------------------------------------- |
| `colSpan`   | `number \| "full" \| Responsive<number \| "full">` | -       | Columns to span, or `"full"` for all columns          |
| `rowSpan`   | `number \| "full" \| Responsive<number \| "full">` | -       | Rows to span, or `"full"` for all rows                |
| `colStart`  | `number \| Responsive<number>`                     | -       | 1-based column line to start at (`grid-column-start`) |
| `colEnd`    | `number \| Responsive<number>`                     | -       | 1-based column line to end at (`grid-column-end`)     |
| `className` | `string`                                           | -       | Additional CSS classes                                |
| `children`  | `React.ReactNode`                                  | -       | Cell content                                          |

All standard HTML `<div>` props are also accepted.

## Responsive values

`columns`, `rows`, `gap`, `gapX`, `gapY`, and every `Grid.Item` prop accept either a single value (applied at all breakpoints) or a breakpoint object. Breakpoints align with Tailwind: `initial` (base), `sm`, `md`, `lg`, `xl`, `2xl`.

```tsx
// 1 column on mobile, 2 from md, 4 from xl
<Grid columns={{ initial: 1, md: 2, xl: 4 }} gap={4}>
  {/* … */}
</Grid>
```

## Sizing columns

There are three ways to size columns; pick whichever fits.

```tsx
// 1. Equal columns
<Grid columns={4} gap={4}>{/* … */}</Grid>

// 2. Custom track widths (verbatim grid-template-columns)
<Grid columns="280px 1fr" gap={6}>{/* … */}</Grid>

// 3. Auto-fit — as many ≥240px columns as fit, no breakpoints needed
<Grid minChildWidth={240} gap={4}>{/* … */}</Grid>
```

`minChildWidth` accepts a number (pixels) or a string (e.g. `"16rem"`) and takes precedence over `columns` when set.

## Spanning with Grid.Item

```tsx
<Grid columns={4} gap={4}>
  <Grid.Item colSpan={2}>Wide card</Grid.Item>
  <Card.Root>Normal</Card.Root>
  <Grid.Item colSpan={{ initial: "full", md: 1 }} rowSpan={2}>
    Tall
  </Grid.Item>
  <Grid.Item colSpan="full">Full-width footer row</Grid.Item>
</Grid>
```

## Alignment

`align` aligns items within their row (visible when row height exceeds the item), `justify` distributes the columns when they are narrower than the container (e.g. fixed-width tracks), and `flow` controls placement order:

```tsx
<Grid columns="repeat(3, 96px)" gap={4} justify="between" align="center">
  {/* fixed-width columns spread across the container */}
</Grid>
```

> **Note:** `justify` only has a visible effect when the tracks do not fill the container. With fluid `columns={n}` (which uses `1fr` tracks) the columns always fill the width, so `justify` is a no-op — use fixed-width tracks to distribute columns. Likewise, `flow="…-dense"` only differs from the default when items span multiple cells and leave gaps to backfill.

## Examples

### Responsive KPI grid

```tsx
<Grid columns={{ initial: 1, sm: 2, lg: 4 }} gap={4}>
  {metrics.map((m) => (
    <MetricCard key={m.id} title={m.label} value={m.value} />
  ))}
</Grid>
```

### Auto-fitting card gallery

```tsx
<Grid minChildWidth={240} gap={6}>
  {products.map((p) => (
    <Card.Root key={p.sku}>
      <Card.Header title={p.name} description={p.sku} />
    </Card.Root>
  ))}
</Grid>
```

### Sidebar + content (custom widths)

```tsx
<Grid columns="280px 1fr" gap={6}>
  <Card.Root>{/* filters */}</Card.Root>
  <Card.Root>{/* results */}</Card.Root>
</Grid>
```

### Dashboard with a featured panel

```tsx
<Grid columns={{ initial: 1, md: 4 }} gap={4}>
  <Grid.Item colSpan={{ initial: "full", md: 2 }}>
    <Card.Root>Featured</Card.Root>
  </Grid.Item>
  <Card.Root>Stat</Card.Root>
  <Card.Root>Stat</Card.Root>
</Grid>
```

## Styling

`Grid` is a presentational primitive: it renders a single `<div data-slot="grid">` (and `<div data-slot="grid-item">` for cells) styled with Tailwind utilities prefixed `astw:`. Dynamic templates are applied via CSS custom properties, so arbitrary column counts and responsive values work without extra configuration. Pass `className` or `style` to extend or override.

## Related Components

- [Layout](./layout.md) - Page-level scaffold (header + sidebars + main)
- [Card](./card.md) - Common child of a grid cell
- [MetricCard](./metric-card.md) - KPI cards for dashboard grids
