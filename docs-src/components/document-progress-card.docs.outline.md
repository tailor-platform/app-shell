---
kind: code-backed
group: document-progress-card
title: DocumentProgressCard
description: Generic card visualising a document's lifecycle state — optional percentage, stacked progress bar, and status legend
sources:
  - packages/core/src/components/document-progress-card/**
---

# DocumentProgressCard

`DocumentProgressCard` is a generic, presentational card for communicating the lifecycle/fulfilment state of a document in a record detail right rail. It shows an optional completion percentage, a stacked progress bar, and a legend — driven by an arbitrary set of status `segments`.

It is view-only and domain-agnostic: pass the segments and an explicit `percent`. Any domain-specific math — deriving the percentage, or decomposing overlapping buckets into bar segments — lives in the consumer. See [Example: purchase-order fulfilment](#example-purchase-order-fulfilment) for a complete, copyable pattern.

## Import

```tsx
import { DocumentProgressCard } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

<!-- api -->

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

<!-- example: custom-legend -->

## Example: purchase-order fulfilment

A common use is communicating a purchase order's receiving state — **received**, **returned**, and **yet to receive**. `DocumentProgressCard` stays generic, so derive the percentage and the bar breakdown in your component and pass them in. This recipe reproduces the recommended look (labels, indigo/pink/neutral colors, and a bar that decomposes received into "kept" + "returned" against the ordered total):

<!-- example: purchase-order-fulfilment -->

Notes for adapting it:

- **Colors:** `indigo` (received), `pink` (returned), `neutral` (yet to receive) is the recommended set; swap any of the seven palette colors to fit your domain.
- **Bar vs. legend:** the bar uses `received − returned` so the two colored segments don't double-count the returned items, while the `legend` override keeps "Received items" showing the full received figure.
- **`total`:** pass the ordered quantity so the unfilled portion of the bar represents "yet to receive". Omit it (or use the segment sum) if you want a fully-tiled bar instead.
- **Percentage policy:** flip `returnedCountsAsComplete` to decide whether returned items count toward completion.

## Input handling

Segment values are expected to be non-negative numbers. Non-finite or negative values are coerced to `0`, and `percent` is rounded and clamped to `[0, 100]`.

## Related

- [MetricCard](./metric-card.md) — Compact KPI summary card.
- [Card](./card.md) — The underlying card primitive.
