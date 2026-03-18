---
title: MetricCard
description: Compact card for dashboard KPI summaries with label, value, optional trend and comparison
---

# MetricCard

`MetricCard` is a presentational card for displaying a single KPI (key performance indicator) on dashboards. It shows a small label, a prominent value, and optionally a trend indicator and comparison text. In v1 the component is static (no click handler or internal actions).

## Import

```tsx
import { MetricCard } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<MetricCard
  label="Net total payment"
  value="$1,500.00"
  trend={{ direction: "up", value: "+5%" }}
  comparison="vs last month"
/>
```

## Props

| Prop         | Type                                                        | Default      | Description                                                                                                                  |
| ------------ | ----------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `label`      | `string`                                                    | **Required** | Short label (e.g. "Net total", "Revenue")                                                                                    |
| `value`      | `React.ReactNode`                                           | **Required** | Main value (string, number, or custom content)                                                                               |
| `trend`      | `{ direction: "up" \| "down" \| "neutral"; value: string }` | -            | Optional trend (e.g. "+12%", "-5%", "0%")                                                                                    |
| `comparison` | `string`                                                    | -            | Optional comparison text (e.g. "vs last month"). Empty strings are treated as absent and the comparison row is not rendered. |
| `icon`       | `React.ReactNode`                                           | -            | Optional icon in the label row                                                                                               |
| `className`  | `string`                                                    | -            | Additional CSS classes for the card root                                                                                     |

## Trend Directions

- **up** — Positive change (success styling, e.g. green).
- **down** — Negative change (destructive styling, e.g. red).
- **neutral** — No change or neutral (muted styling).

```tsx
<MetricCard
  label="Revenue"
  value="$2,400"
  trend={{ direction: "up", value: "+12%" }}
  comparison="vs last month"
/>

<MetricCard
  label="Costs"
  value="$800"
  trend={{ direction: "down", value: "-5%" }}
  comparison="vs last quarter"
/>

<MetricCard
  label="Balance"
  value="$0"
  trend={{ direction: "neutral", value: "0%" }}
/>
```

## With Icon

```tsx
<MetricCard label="Total orders" value="142" icon={<OrderIcon />} comparison="this week" />
```

## Related

- [Layout](./layout.md) — Page layout for placing MetricCards in a grid.
- [DescriptionCard](./description-card.md) — Structured key-value cards for detail views.
- [Badge](./badge.md) — Status badges that can complement metric displays.
