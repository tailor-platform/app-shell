---
"@tailor-platform/app-shell": minor
---

Add selector-based `aggregations.sum(selector)`, `avg(selector)`, `min(selector)`, `max(selector)`, and `count(selector)` helpers. Each requires a row selector and accepts an optional second, result-only transformer, returning a reusable callback over `{ rows }` without depending on React or DataTable.

Use the callback as an ordinary `Column.footer` renderer to summarize the current page. Numeric selectors are type-checked and selected values are also validated at runtime, without changing the existing column helper or footer context API. The selector determines the source independently of the column's ID or accessor.

```tsx
import { aggregations, createColumnHelper } from "@tailor-platform/app-shell";

const { column } = createColumnHelper<Order>();
column({ id: "quantity", type: "number", footer: aggregations.sum((row) => row.quantity) });
```
