---
"@tailor-platform/app-shell": minor
---

Add `DocumentProgressCard` — a presentational card for a transactional document's fulfilment state: a derived completion percentage, a stacked progress bar, and a status legend for received / returned / yet-to-receive buckets. View-only — pass in the raw amounts and the component derives the percentage and bar widths.

```tsx
import { DocumentProgressCard } from "@tailor-platform/app-shell";

<DocumentProgressCard
  received={{ value: 12 }}
  returned={{ value: 2 }}
  yetToReceive={{ value: 28 }}
/>;
```

Each bucket accepts `{ value, label?, color? }` (labels and colors default per bucket). The percentage is `received / total` by default (`total = received + yetToReceive`); pass `returnedCountsAsComplete={false}` to subtract returned items from progress. `title` defaults to `"Fulfilment rate"`.
