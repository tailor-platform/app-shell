---
title: ProcurementFulfilmentProgressCard
description: Opinionated received / returned / yet-to-receive card with a derived purchase-order fulfilment percentage
---

# ProcurementFulfilmentProgressCard

`ProcurementFulfilmentProgressCard` is an opinionated wrapper over [DocumentProgressCard](./document-progress-card.md) for purchase-order fulfilment: items **received**, **returned**, and **yet to receive** against a purchase order. It owns the receiving business logic — deriving the completion percentage and the bar decomposition — while remaining flexible on labels and colors.

Use it in a record detail right rail to communicate fulfilment state. For other document workflows (e.g. shipped / cancelled / pending), use the generic `DocumentProgressCard` directly.

## Import

```tsx
import { ProcurementFulfilmentProgressCard } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<ProcurementFulfilmentProgressCard
  received={{ value: 12 }}
  returned={{ value: 2 }}
  yetToReceive={{ value: 28 }}
/>
```

## Props

| Prop                       | Type                        | Default             | Description                                                                         |
| -------------------------- | --------------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| `received`                 | `ProcurementFulfilmentItem` | **Required**        | Items received so far. Default label `"Received items"`, color `"indigo"`.          |
| `returned`                 | `ProcurementFulfilmentItem` | **Required**        | Items received then returned. Default label `"Returned items"`, color `"pink"`.     |
| `yetToReceive`             | `ProcurementFulfilmentItem` | **Required**        | Items not yet received. Default label `"Yet to receive"`, color `"neutral"`.        |
| `title`                    | `React.ReactNode`           | `"Fulfilment rate"` | Card title shown top-left.                                                          |
| `returnedCountsAsComplete` | `boolean`                   | `true`              | Whether returned items count toward the percentage (see [Percentage](#percentage)). |
| `className`                | `string`                    | -                   | Additional CSS classes for the card root.                                           |

### `ProcurementFulfilmentItem`

| Field   | Type                    | Description                                           |
| ------- | ----------------------- | ----------------------------------------------------- |
| `value` | `number`                | Amount for the bucket — shown in the legend.          |
| `label` | `string`                | Legend label. Falls back to the bucket default.       |
| `color` | `DocumentProgressColor` | Marker / bar color. Falls back to the bucket default. |

## Percentage

The completion percentage is **derived**:

- `total = received + yetToReceive` — returned is a subset of received, so it does not change the denominator.
- By default (`returnedCountsAsComplete: true`): `percent = received / total`.
- With `returnedCountsAsComplete={false}`: `percent = (received − returned) / total`.

The result is rounded and clamped to `[0, 100]`; a zero total renders `0%`.

## Bar & legend

The bar is a composition: a **net received** segment (`received − returned`, indigo) followed by a **returned** segment (pink), over a `total` of `received + yetToReceive` — so the unfilled remainder represents yet-to-receive. The legend shows the three buckets as provided, with `received` showing the full received amount.

## Input handling

Amounts are coerced to non-negative finite numbers, and `returned` is clamped to `received` (it represents a subset of received items), so the bar, percentage, and legend can never contradict one another.

## Related

- [DocumentProgressCard](./document-progress-card.md) — The generic card this wraps; use it for arbitrary status segments.
- [MetricCard](./metric-card.md) — Compact KPI summary card.
