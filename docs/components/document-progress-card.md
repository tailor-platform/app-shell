---
title: DocumentProgressCard
description: Generic card visualising a document's lifecycle state — optional percentage, stacked progress bar, and status legend
---

# DocumentProgressCard

`DocumentProgressCard` is a generic, presentational card for communicating the lifecycle/fulfilment state of a document in a record detail right rail. It shows an optional completion percentage, a stacked progress bar, and a legend — driven by an arbitrary set of status `segments`.

It is view-only and domain-agnostic: pass the segments and an explicit `percent`. For the receiving model (received / returned / yet-to-receive) with a derived percentage, use [ProcurementFulfilmentProgressCard](./procurement-fulfilment-progress-card.md), which composes this card.

## Import

```tsx
import { DocumentProgressCard } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<DocumentProgressCard
  title="Shipment status"
  percent={60}
  segments={[
    { label: "Shipped", value: 30, color: "green" },
    { label: "Returned", value: 3, color: "red" },
    { label: "Pending", value: 17, color: "neutral" },
  ]}
/>
```

## Props

| Prop        | Type                        | Default       | Description                                                                                               |
| ----------- | --------------------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| `segments`  | `DocumentProgressSegment[]` | **Required**  | Status segments rendered as a stacked bar (and, by default, the legend).                                  |
| `title`     | `React.ReactNode`           | -             | Optional card title shown top-left.                                                                       |
| `percent`   | `number`                    | -             | Optional headline percentage (0–100), shown top-right. Explicit — the generic card derives no progress.   |
| `legend`    | `DocumentProgressSegment[]` | `segments`    | Optional legend rows; override only when the legend should differ from the bar (see [Legend](#legend)).   |
| `total`     | `number`                    | sum of values | Denominator used to size the bar. A value larger than the segment sum leaves an unfilled track remainder. |
| `className` | `string`                    | -             | Additional CSS classes for the card root.                                                                 |

### `DocumentProgressSegment`

| Field   | Type                    | Description                                            |
| ------- | ----------------------- | ------------------------------------------------------ |
| `label` | `string`                | Legend label.                                          |
| `value` | `number`                | Amount — shown in the legend and used to size the bar. |
| `color` | `DocumentProgressColor` | Bar / marker color (required).                         |

`DocumentProgressColor` is one of: `"indigo"`, `"pink"`, `"green"`, `"amber"`, `"red"`, `"blue"`, `"neutral"`.

## Progress Bar

The bar tiles `segments` left-to-right, each sized as `value / (total ?? sum of values)`. When `total` exceeds the segment sum, the shortfall renders as an empty `bg-muted` track — useful for a "remaining" portion you don't want as a colored segment. A `"neutral"` segment reads as a muted/track-like fill.

## Legend

By default the legend mirrors `segments`. Pass `legend` to render different rows — for example when buckets overlap and the bar shows a decomposition while the legend shows the raw figures:

```tsx
<DocumentProgressCard
  percent={30}
  total={40}
  segments={[
    { label: "Net received", value: 10, color: "indigo" },
    { label: "Returned", value: 2, color: "pink" },
  ]}
  legend={[
    { label: "Received items", value: 12, color: "indigo" },
    { label: "Returned items", value: 2, color: "pink" },
    { label: "Yet to receive", value: 28, color: "neutral" },
  ]}
/>
```

## Input handling

Segment values are expected to be non-negative numbers. Non-finite or negative values are coerced to `0`, and `percent` is rounded and clamped to `[0, 100]`.

## Related

- [ProcurementFulfilmentProgressCard](./procurement-fulfilment-progress-card.md) — Opinionated received/returned/yet-to-receive wrapper with a derived percentage.
- [MetricCard](./metric-card.md) — Compact KPI summary card.
- [Card](./card.md) — The underlying card primitive.
