---
"@tailor-platform/app-shell": minor
---

Add `DocumentProgressCard` — a generic, presentational card for a document's lifecycle/fulfilment state: an optional headline percentage, a stacked progress bar, and a status legend driven by arbitrary `segments`. It's domain-agnostic, so it stretches to any status breakdown (shipped / cancelled / pending, PO received / returned / yet-to-receive, etc.).

```tsx
import { DocumentProgressCard } from "@tailor-platform/app-shell";

<DocumentProgressCard
  title="Shipment status"
  percent={60}
  segments={[
    { label: "Shipped", value: 30, color: "green" },
    { label: "Returned", value: 3, color: "red" },
    { label: "Pending", value: 17, color: "neutral" },
  ]}
/>;
```

Each segment is `{ label, value, color }`. Pass an explicit `percent`, an optional `total` (leave a value larger than the segment sum to render an unfilled track remainder), and an optional `legend` override for when the legend should differ from the bar (e.g. overlapping buckets). Percentage and any domain-specific breakdown are derived in the consumer — see the docs for a purchase-order fulfilment recipe.
