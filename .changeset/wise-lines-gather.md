---
"@tailor-platform/app-shell": minor
---

Add `LineItems` — a spreadsheet-grade editable table for the lines of a document (purchase orders, invoices, journals, stock transfers), plus the `useLineItems` hook and the `createLineItemHelper` field-schema builder.

State lives in the hook; the compound parts render it. `getChangeSet()` returns a transport-agnostic description of what changed, so only real edits are submitted. Lines are keyed by `id` (or `idKey`), like DataTable rows; new lines leave it unset until `reset(savedLines)` or `reset({ idMap })` brings in the server's ids after a save.

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
    rowSelection: {},
  });

  return (
    <LineItems.Root value={lineItems}>
      <LineItems.Search />
      <LineItems.Table />
      <LineItems.SaveActions
        onSave={async (changeSet) => lineItems.reset(await submit(changeSet.lineChanges))}
      />
    </LineItems.Root>
  );
}
```

For documents with more than one list of lines (journal debits and credits, work-order components and operations), `useLineItemsGroup({ debits, credits })` puts several `useLineItems` collections under one save boundary: a shared `isDirty`, one keyed `getChangeSet()`, and group-wide `reset()` / `revert()`.

Includes view, edit and amend modes, inline cell editors that commit on blur or Enter, range selection with TSV copy/paste, pinned columns, a sticky totals row, select fields over a fixed list or a backend `fetcher`, row selection with an optional bulk-action bar (`rowSelection`, the same option and `SelectionAction` shape as DataTable, with the bar at the table's foot and actions limited to edit mode unless they opt into amend), row virtualization for long documents, and drag reordering with a keyboard fallback on the grip handle.

Built-in labels are localized (English and Japanese) through the app locale, like DataTable.
