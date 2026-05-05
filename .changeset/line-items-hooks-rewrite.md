---
"@tailor-platform/app-shell": minor
---

LineItems: rewrite around a public `useLineItems()` hook + compound components.

The line-items module now follows the "hooks own logic, components own layout" pattern. Variants (Journal Entry, Work Order, Purchase Order baseline) compose freely instead of demanding ever-more props.

### What's new

- **`useLineItems<T>()`** is the single source of truth for a document. It owns row order, the dirty baseline, filter, bulk row selection, and every imperative mutation (`addLine`, `updateField`, `updateLines`, `removeLine`, `reorderLine`, `toggleSelect`, `selectAllVisible`, `clearSelection`, `bulkUpdate`, `bulkRemove`, `duplicateLastLine`, `reset`, `getChangeSet`). `isDirty` is reactive — no more `onChangeSet` push callback.
- **`createLineItemHelper<T>().field({...})`** is the typed schema builder. Each field declares `key`, `label`, `render(line)`, `editable: LineItemsMode[]`, `type: { kind: "text" | "number"; decimals? }`, `commit: "document" | "metadata"`, `sort.comparator`, `search`, `align`, `className`. Computed read-only columns just pick a unique `key` and omit `editable` / `type`.
- **`LineItems.*` compound components** replace the monolithic `<LineItems columns={...} />`:
  - `<LineItems.Root value={hook}>` — provider + fullscreen container (Esc exits).
  - `<LineItems.Table maxBodyHeight={1000} />` — virtualized table with always-on spreadsheet UX (range select, fill-drag, TSV copy/paste, keyboard nav).
  - `<LineItems.Search />` — controlled by `hook.filter` / `setFilter`.
  - `<LineItems.BulkActions>{({ selectedIds, bulkUpdate, bulkRemove, clear }) => …}</LineItems.BulkActions>` — render-prop, gated on selection.
  - `<LineItems.AddRow>` — children-as-slot for an inline empty row beneath the table.
  - `<LineItems.FullscreenToggle />` — hoistable expand button (default rendered inside `<LineItems.Table />`).
  - `<LineItems.SaveActions onSave={…} />` — Discard + Save, auto-disabled on `!isDirty`.
- The `cellInteraction` mode is dropped — spreadsheet behaviors are always-on.

### BREAKING

The previous `<LineItems columns={…} initialLines={…} onChangeSet={…} />` API is removed entirely. The following types are no longer exported: `LineItemsRootRef`, `LineItemsCellInteractionMode`, `LineItemsColumnDef`, `LineItemsAddSlotRenderArgs`, `LineItemsInlineAddRowRenderArgs`, `LineItemsMutationScope`, `LineItemsCellRendererContext`. The `LineItemsQuickAdd` component is also removed.

### Migration

```tsx
// Before
const ref = React.useRef<LineItemsRootRef>(null);
<LineItems<POLine>
  ref={ref}
  initialLines={initial}
  columns={[
    { id: "sku", header: "SKU", accessorKey: "sku", sortable: true },
    {
      id: "qty",
      header: "Qty",
      accessorKey: "qty",
      align: "right",
      normalize: (v) => Number(v),
      equals: (a, b) => Number(a) === Number(b),
    },
    { id: "note", header: "Note", accessorKey: "note", mutationScope: "metadata" },
  ]}
  onChangeSet={(cs) => setChangeSet(cs)}
  enableBulkActions
  cellInteraction="spreadsheet"
/>;

// After
const f = createLineItemHelper<POLine>();
const fields = [
  f.field({
    key: "sku",
    label: "SKU",
    render: (l) => l.sku,
    editable: ["edit"],
    type: { kind: "text" },
    sort: { comparator: (a, b) => a.sku.localeCompare(b.sku) },
    search: (l, q) => l.sku.toLowerCase().includes(q.toLowerCase()),
  }),
  f.field({
    key: "qty",
    label: "Qty",
    render: (l) => l.qty,
    editable: ["edit", "amend"],
    type: { kind: "number", decimals: 0 },
    align: "right",
  }),
  f.field({
    key: "note",
    label: "Note",
    render: (l) => l.note,
    editable: ["edit", "amend"],
    type: { kind: "text" },
    commit: "metadata",
  }),
];

const lineItems = useLineItems<POLine>({ fields, data: initial, selection: true });

<LineItems.Root value={lineItems}>
  <LineItems.Search />
  <LineItems.BulkActions>
    {({ bulkRemove, clear }) => (
      <>
        <Button onClick={bulkRemove}>Delete</Button>
        <Button variant="ghost" onClick={clear}>
          Clear
        </Button>
      </>
    )}
  </LineItems.BulkActions>
  <LineItems.Table maxBodyHeight={1000} />
  <LineItems.AddRow>
    {/* host JSX, e.g. <Combobox onValueChange={(p) => lineItems.addLine(...)} /> */}
  </LineItems.AddRow>
  <LineItems.SaveActions onSave={() => save(lineItems.getChangeSet())} />
</LineItems.Root>;
```

Imperative ref methods are replaced 1:1 by hook methods: `ref.resetBaseline()` → `lineItems.reset()`, `ref.getChangeSet()` → `lineItems.getChangeSet()`, `ref.hasChanges()` → `lineItems.isDirty`, `ref.duplicateLastLine()` → `lineItems.duplicateLastLine()`. `ref.focusLine()` is no longer provided — focus the cell directly through the DOM if needed.
