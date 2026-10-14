---
"@tailor-platform/app-shell": minor
---

Add `LineItems` — a spreadsheet-grade editable table for the lines of a document (purchase orders, invoices, journals, stock transfers), plus the `useLineItems` hook and the `createLineItemHelper` field-schema builder.

State lives in the hook; the compound parts render it. `getChangeSet()` returns a transport-agnostic description of what changed, so only real edits are submitted.

```tsx
import { LineItems, useLineItems, createLineItemHelper } from "@tailor-platform/app-shell";

const f = createLineItemHelper<POLine>();
const fields = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: { kind: "text" },
  }),
  f.field({
    key: "quantity",
    label: "Qty",
    render: (l) => l.quantity ?? 0,
    editable: ["edit"],
    type: { kind: "number", decimals: 0 },
  }),
];

function Lines({ lines }: { lines: POLine[] }) {
  const lineItems = useLineItems<POLine>({
    fields,
    defaultLines: lines,
    ordering: "manual",
    selection: true,
  });

  return (
    <LineItems.Root value={lineItems}>
      <LineItems.Search />
      <LineItems.Table />
      <LineItems.SaveActions onSave={(changeSet) => submit(changeSet.lineChanges)} />
    </LineItems.Root>
  );
}
```

For documents with more than one list of lines (journal debits and credits, work-order components and operations), `useLineItemsGroup({ debits, credits })` puts several `useLineItems` collections under one save boundary: a shared `isDirty`, one keyed `getChangeSet()`, and group-wide `reset()` / `revert()`.

Includes view and edit modes, inline cell editors that commit on blur or Enter, range selection with TSV copy/paste, pinned columns, a sticky totals row, row selection with an optional bulk-action bar (`selection: { actions }`, the same bar as DataTable, at the table's foot), row virtualization for long documents, and drag reordering with a keyboard fallback on the grip handle.

Built-in labels are localized (English and Japanese) through the app locale, like DataTable.
