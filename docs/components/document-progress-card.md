---
title: DocumentProgressCard
description: Card visualising a document's fulfilment state — completion percentage, stacked progress bar, and status legend
---

# DocumentProgressCard

`DocumentProgressCard` is a presentational card for communicating the fulfilment / lifecycle state of a transactional document (purchase order, shipment, etc.) in a record detail right rail. It shows a derived completion percentage, a stacked progress bar, and a legend for the three status buckets: **received**, **returned**, and **yet to receive**.

The component is view-only: pass in the raw amounts and it derives the percentage and bar widths. It carries no data-fetching or domain logic.

## Import

```tsx
import { DocumentProgressCard } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<DocumentProgressCard
  received={{ value: 12 }}
  returned={{ value: 2 }}
  yetToReceive={{ value: 28 }}
/>
```

## Props

| Prop                       | Type                   | Default             | Description                                                                                    |
| -------------------------- | ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `received`                 | `DocumentProgressItem` | **Required**        | Items received so far. Default label `"Received items"`, color `"indigo"`.                     |
| `returned`                 | `DocumentProgressItem` | **Required**        | Items received then returned. Default label `"Returned items"`, color `"pink"`.                |
| `yetToReceive`             | `DocumentProgressItem` | **Required**        | Items not yet received. Default label `"Yet to receive"`, color `"neutral"`.                   |
| `title`                    | `React.ReactNode`      | `"Fulfilment rate"` | Card title shown top-left.                                                                     |
| `returnedCountsAsComplete` | `boolean`              | `true`              | Whether returned items count toward the completion percentage (see [Percentage](#percentage)). |
| `className`                | `string`               | -                   | Additional CSS classes for the card root.                                                      |

### `DocumentProgressItem`

| Field   | Type                    | Description                                                           |
| ------- | ----------------------- | --------------------------------------------------------------------- |
| `value` | `number`                | Amount for the bucket — shown in the legend and used to size the bar. |
| `label` | `string`                | Legend label. Falls back to the bucket default.                       |
| `color` | `DocumentProgressColor` | Marker / bar color. Falls back to the bucket default.                 |

`DocumentProgressColor` is one of: `"indigo"`, `"pink"`, `"green"`, `"amber"`, `"red"`, `"blue"`, `"neutral"`.

## Percentage

The completion percentage is **derived**, not passed in:

- `total = received + yetToReceive` — returned is a subset of received, so it does not change the denominator.
- By default (`returnedCountsAsComplete: true`): `percent = received / total`. Returned items still count as received/complete.
- With `returnedCountsAsComplete={false}`: `percent = (received − returned) / total`. Returned items are subtracted from progress.

The result is rounded and clamped to `[0, 100]`. A zero total renders `0%`.

```tsx
// Returned items subtracted from progress
<DocumentProgressCard
  received={{ value: 12 }}
  returned={{ value: 2 }}
  yetToReceive={{ value: 28 }}
  returnedCountsAsComplete={false}
/>
```

## Progress Bar

The bar is a composition of the document's state: a **net received** segment (`received − returned`, indigo) followed by a **returned** segment (pink), with the unfilled remainder representing yet-to-receive. An untouched document shows an empty track.

The header percentage maps onto the bar: it always equals the **net received** segment, plus the **returned** segment when `returnedCountsAsComplete` is `true` (the default). With `returnedCountsAsComplete={false}`, the header equals just the net-received segment, and the returned segment is shown as a distinct category beyond it.

## Input handling

Amounts are expected to be non-negative numbers. Non-finite or negative values are coerced to `0`, and `returned` is clamped to `received` (it represents a subset of received items), so the bar, percentage, and legend can never contradict one another.

## Relabelling for other documents

Although the buckets are named for receiving, the labels and colors are overridable, so the card works for any three-state lifecycle:

```tsx
<DocumentProgressCard
  title="Shipment status"
  received={{ value: 30, label: "Shipped", color: "green" }}
  returned={{ value: 3, label: "Returned", color: "red" }}
  yetToReceive={{ value: 17, label: "Pending", color: "neutral" }}
/>
```

## Related

- [MetricCard](./metric-card.md) — Compact KPI summary card.
- [Card](./card.md) — The underlying card primitive.
- [Badge](./badge.md) — Status badges that can complement progress displays.
