---
"@tailor-platform/app-shell": minor
---

Add `LineItems`, `useLineItems`, and `createLineItemHelper` for document-owned text, number, boolean, date, fixed/async combobox, and custom structured-value editing, with validation, explicit save snapshots, manual ordering with built-in desktop drag handles and keyboard reordering, footers, and pinned auto/px/flex columns.
Add DataTable-compatible controlled/uncontrolled checkbox selection through `useLineItems({ rowSelection })`, using `selectedIds`, `defaultSelectedIds`, `onChange`, and typed `actions` shared through context, always fixed before drag handles and data columns and excluded from column preferences. LineItems.Root now provides its own bordered, rounded frame, and `LineItems.Footer` renders ordinary children like DataTable.Footer and reads selection/actions from context, including count, Clear, overflow, and pending-action controls. Selection state, action rendering, and their public contracts are shared in table-core; document adapters reconcile removed rows and acknowledged IDs. Frame and footer surfaces are shared with DataTable; generic Toolbar corners and dividers fit the frame automatically. Bulk actions remain application-owned. Boolean cells retain their editable tint while the checkbox is focused instead of switching to an untinted background.
Add `LineItems.Search` for incremental in-memory substring search, projecting matching `lines` without changing `allLines`, drafts, validation, footer totals, or save state. Compose it with a generic `Toolbar` and `LineItems.ColumnSettings` inside one Root to reorder/pin columns, with optional browser-local `tableId` persistence independent of document edits. Typed input, combobox search, and calendar controls are shared with DataTable while preserving its callback, keyboard, and datetime contracts. The shared Columns popup retains DataTable's existing UI, and LineItems headers offer the same copy-label and pin context menu. `DataTable.Toolbar` is deprecated without removing its existing behavior; multiple right-fixed columns now retain their display order.

Use optional `edit.onValueCommitted(row, value)` for cell checks before internal adoption, with DataTable-compatible throw/reject handling and `CellEditError` messages. Whole-document validation belongs in `useLineItems({ validate })`: return document/cell issues synchronously or asynchronously after all drafts are confirmed. Validation results are stored only at save preparation, and obsolete attempts/results are discarded on editing, reset, or Discard without blocking a new attempt.

Use `commitEdits()` before submitting and acknowledge the exact snapshot with `reset(saved.lines, { sent, idMap })` to retain edits made during a request. Controlled rows, metadata persistence, virtualization, and spreadsheet operations are not yet supported.

```tsx
import { LineItems, useLineItems } from "@tailor-platform/app-shell";

const lines = useLineItems({ columns, defaultLines, ordering: "manual" });

<LineItems.Root value={lines}>
  <LineItems.Table aria-label="Document lines" />
  <LineItems.Footer>{footerControls}</LineItems.Footer>
</LineItems.Root>;
```
