---
kind: code-backed
group: metric-card
title: MetricCard
description: Compact card for dashboard KPI summaries with title, value, optional trend and description
sources:
  - packages/core/src/components/metric-card/**
---

# MetricCard

`MetricCard` is a presentational card for displaying a single KPI (key performance indicator) on dashboards. It shows a small title, a prominent value, and optionally a trend indicator and supplementary description text. In v1 the component is static (no click handler or internal actions).

## Import

```tsx
import { MetricCard } from "@tailor-platform/app-shell";
```

The examples below also import `Grid` from `@tailor-platform/app-shell` and `ShoppingCart` from `lucide-react`.

## Basic Usage

<!-- example: basic-usage -->

<!-- api -->

## Trend Directions

- **up** — Positive change (success styling, e.g. green).
- **down** — Negative change (destructive styling, e.g. red).
- **neutral** — No change or neutral (muted styling).

<!-- example: trend-directions -->

## With Icon

<!-- example: with-icon -->

## Related

- [Grid](./grid.md) — Arrange MetricCards in responsive columns (e.g. KPI grids).
- [Layout](./layout.md) — Page layout for placing MetricCards in a grid.
- [DescriptionCard](./description-card.md) — Structured key-value cards for detail views.
- [Badge](./badge.md) — Status badges that can complement metric displays.
