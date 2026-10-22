---
"@tailor-platform/app-shell": minor
---

Add `Column.footer` for totals and summaries in a sticky row that follows column layout without adding synthetic data rows.
Footer renderers receive the current page's read-only rows through the exported `FooterRenderContext<TRow>`, mirroring the named `HeaderRenderContext` API.
The existing `DataTable.Footer` pagination and bulk-action container is unchanged.

```tsx
import type { Column } from "@tailor-platform/app-shell";

const columns: Column<{ quantity: number | null }>[] = [
  {
    id: "quantity",
    label: "Quantity",
    type: "number",
    footer: ({ rows }) => rows.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
  },
];
```
