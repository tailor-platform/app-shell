---
title: DocumentProgressCard
description: Generic card visualising a document's lifecycle state — optional percentage, stacked progress bar, and status legend
---

# DocumentProgressCard

`DocumentProgressCard` is a generic, presentational card for communicating the lifecycle/fulfilment state of a document in a record detail right rail. It shows an optional completion percentage, a stacked progress bar, and a legend — driven by an arbitrary set of status `segments`.

It is view-only and domain-agnostic: pass the segments and an explicit `percent`. Any domain-specific math — deriving the percentage, or decomposing overlapping buckets into bar segments — lives in the consumer. See [Example: purchase-order fulfilment](#example-purchase-order-fulfilment) for a complete, copyable pattern.

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

## Example: purchase-order fulfilment

A common use is communicating a purchase order's receiving state — **received**, **returned**, and **yet to receive**. `DocumentProgressCard` stays generic, so derive the percentage and the bar breakdown in your component and pass them in. This recipe reproduces the recommended look (labels, indigo/pink/neutral colors, and a bar that decomposes received into "kept" + "returned" against the ordered total):

```tsx
function PurchaseOrderFulfilment({
  received,
  returned,
  yetToReceive,
  // Whether returned items still count as fulfilled. Set false to subtract them.
  returnedCountsAsComplete = true,
}: {
  received: number;
  returned: number;
  yetToReceive: number;
  returnedCountsAsComplete?: boolean;
}) {
  // Returned is a subset of received; clamp so the breakdown can't exceed it.
  const effectiveReturned = Math.min(Math.max(returned, 0), Math.max(received, 0));
  const total = Math.max(received, 0) + Math.max(yetToReceive, 0); // the ordered quantity
  const complete = returnedCountsAsComplete ? received : received - effectiveReturned;
  const percent = total > 0 ? Math.round((complete / total) * 100) : 0;

  return (
    <DocumentProgressCard
      title="Fulfilment rate"
      percent={percent}
      total={total} // ordered quantity — the shortfall renders as the "yet to receive" track
      // Bar: net received (kept) + returned. Yet-to-receive is the unfilled remainder.
      segments={[
        { label: "Received items", value: received - effectiveReturned, color: "indigo" },
        { label: "Returned items", value: effectiveReturned, color: "pink" },
      ]}
      // Legend: the three buckets as-is, so "Received items" shows the full amount.
      legend={[
        { label: "Received items", value: received, color: "indigo" },
        { label: "Returned items", value: returned, color: "pink" },
        { label: "Yet to receive", value: yetToReceive, color: "neutral" },
      ]}
    />
  );
}

// <PurchaseOrderFulfilment received={12} returned={2} yetToReceive={28} /> → 30%
```

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
