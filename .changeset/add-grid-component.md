---
"@tailor-platform/app-shell": minor
---

Add `Grid` — a generic, presentational CSS-Grid layout primitive for arranging arbitrary children into equal or custom-width columns, with responsive reflow, gap control, auto-fit, and optional `Grid.Item` spanning. Complements `Layout` (page scaffold) by handling content-level grids.

```tsx
import { Grid } from "@tailor-platform/app-shell";

// Responsive KPI grid: 1 → 2 → 4 columns
<Grid columns={{ initial: 1, sm: 2, lg: 4 }} gap={4}>
  <Card.Root>…</Card.Root>
</Grid>

// Auto-fitting gallery — no breakpoints needed
<Grid minChildWidth={240} gap={6}>{items}</Grid>

// Custom column widths + spanning
<Grid columns="280px 1fr" gap={6}>
  <Grid.Item colSpan={2}>Wide</Grid.Item>
</Grid>
```

Props: `columns`, `rows`, `gap`/`gapX`/`gapY` (defaults to `3` / 12px), `minChildWidth`, `flow`, `align`, `justify`. `Grid.Item` supports `colSpan`, `rowSpan`, `colStart`, `colEnd` — all responsive.
