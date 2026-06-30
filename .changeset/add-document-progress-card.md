---
"@tailor-platform/app-shell": minor
---

Add `DocumentProgressCard` and `ProcurementFulfilmentProgressCard`.

`DocumentProgressCard` is a generic, presentational card for a document's lifecycle/fulfilment state: an optional headline percentage, a stacked progress bar, and a status legend driven by arbitrary `segments`. It's domain-agnostic, so it stretches to any status breakdown (shipped / cancelled / pending, etc.).

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

`ProcurementFulfilmentProgressCard` is an opinionated wrapper over it for the goods-receipt model — received / returned / yet-to-receive — that owns the receiving business logic (derived percentage, `returned` clamped to `received`, net-received/returned bar decomposition) while keeping labels and colors overridable.

```tsx
import { ProcurementFulfilmentProgressCard } from "@tailor-platform/app-shell";

<ProcurementFulfilmentProgressCard
  received={{ value: 12 }}
  returned={{ value: 2 }}
  yetToReceive={{ value: 28 }}
/>;
```

The percentage is `received / total` by default (`total = received + yetToReceive`); pass `returnedCountsAsComplete={false}` to subtract returns. `title` defaults to `"Fulfilment rate"`.
