---
title: MetricCard
description: Compact card for dashboard KPI summaries with title, value, optional trend and description
---

# MetricCard

`MetricCard` is a presentational card for displaying a single KPI (key performance indicator) on dashboards. It shows a small title, a prominent value, and optionally a trend indicator and supplementary description text. In v1 the component is static (no click handler or internal actions).

## Import

```tsx
import { MetricCard } from "@tailor-platform/app-shell"
```

## Basic Usage

```tsx preview
import { MetricCard } from "@tailor-platform/app-shell"
;<MetricCard
  title="Net total payment"
  value="$1,500.00"
  trend={{ direction: "up", value: "+5%" }}
  description="vs last month"
/>
```

## Props

| Prop          | Type                                                        | Default      | Description                                                                                                            |
| ------------- | ----------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `title`       | `string`                                                    | **Required** | Short title / header (e.g. "Net total", "Revenue")                                                                     |
| `value`       | `React.ReactNode`                                           | **Required** | Main value (string, number, or custom content)                                                                         |
| `trend`       | `{ direction: "up" \| "down" \| "neutral"; value: string }` | -            | Optional trend (e.g. "+12%", "-5%", "0%")                                                                              |
| `description` | `string`                                                    | -            | Optional supplementary text (e.g. "vs last month", "this week"). Empty strings are treated as absent and not rendered. |
| `icon`        | `React.ReactNode`                                           | -            | Optional icon in the title row                                                                                         |
| `className`   | `string`                                                    | -            | Additional CSS classes for the card root                                                                               |

## Trend Directions

- **up** — Positive change (success styling, e.g. green).
- **down** — Negative change (destructive styling, e.g. red).
- **neutral** — No change or neutral (muted styling).

```tsx preview wrap="row"
import { MetricCard } from "@tailor-platform/app-shell";

<MetricCard
  title="Revenue"
  value="$2,400"
  trend={{ direction: "up", value: "+12%" }}
  description="vs last month"
/>

<MetricCard
  title="Costs"
  value="$800"
  trend={{ direction: "down", value: "-5%" }}
  description="vs last quarter"
/>

<MetricCard
  title="Balance"
  value="$0"
  trend={{ direction: "neutral", value: "0%" }}
/>
```

## With Icon

```tsx
<MetricCard title="Total orders" value="142" icon={<OrderIcon />} description="this week" />
```

## Related

- [Layout](./layout.md) — Page layout for placing MetricCards in a grid.
- [DescriptionCard](./description-card.md) — Structured key-value cards for detail views.
- [Badge](./badge.md) — Status badges that can complement metric displays.
