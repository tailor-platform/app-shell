---
"@tailor-platform/app-shell": minor
---

Add `LineItems`, `useLineItems`, and `createLineItemHelper` for document-owned text, number, boolean, date, fixed/async combobox, and custom structured-value editing, with validation, explicit save snapshots, manual ordering, footers, and pinned auto/px/flex columns.
Compose a generic `Toolbar` with `LineItems.ColumnSettings` inside one Root to reorder/pin columns, with optional browser-local `tableId` persistence independent of document edits. Typed input, combobox search, and calendar controls are shared with DataTable while preserving its callback, keyboard, and datetime contracts. The shared Columns popup retains DataTable's existing UI, and LineItems headers offer the same copy-label and pin context menu. `DataTable.Toolbar` is deprecated without removing its existing behavior; multiple right-fixed columns now retain their display order.

Use `commitEdits()` before submitting and acknowledge the exact snapshot with `reset(saved.lines, { sent, idMap })` to retain edits made during a request. Controlled rows, metadata persistence, virtualization, and spreadsheet operations are not yet supported.

```tsx
import { LineItems, useLineItems } from "@tailor-platform/app-shell";

const lines = useLineItems({ columns, defaultLines });

<LineItems.Root value={lines}>
  <LineItems.Table aria-label="Document lines" />
</LineItems.Root>;
```
