---
"@tailor-platform/app-shell": minor
---

Add standalone `aggregations.sum()`, `avg()`, `min()`, `max()`, and `count()` functions over raw value arrays. Each accepts an optional result-only transformer and can be reused independently of DataTable.

Pass an aggregation directly to `Column.footer` to aggregate the target column's current-page values. Inline bound `column()` definitions check numeric source types; custom footer callbacks can also inspect the read-only `ctx.column` configuration.

```tsx
import { aggregations, createColumnHelper } from "@tailor-platform/app-shell";

const { column } = createColumnHelper<Order>();
column({ id: "quantity", type: "number", footer: aggregations.sum() });
```
