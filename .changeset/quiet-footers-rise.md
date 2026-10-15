---
"@tailor-platform/app-shell": minor
---

Add ID-based bulk actions to `DataTable`. Pass `selectionActions` to `useDataTable` and, while rows are selected, `DataTable.Footer` becomes a bulk-action bar: the selection count, your actions, and a Clear button, with pagination kept alongside. `onClick` receives a click-time copy of all selected ids, including ids whose rows have not been loaded. Consumers own eligibility checks, required fetching, confirmation UI, and execution; selection actions do not have row-based `canApply` or automatic eligible counts/disabled states.

Return the promise from `onClick` for pending-state tracking: actions and Clear are disabled with a spinner meanwhile. A confirmation dialog can hand a later request back through `helpers.run`. Neither success nor rejection changes selection, and there is no `keepSelection` option. Use controlled `rowSelection` to remove only ids actually changed from the current selection, preserving ineligible records and newer selections. The explicit `clearSelection` helper remains available for intentional clearing of every page.

```tsx
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const table = useDataTable({
  columns,
  data,
  control,
  rowSelection: { selectedIds, onChange: setSelectedIds },
  selectionActions: [
    {
      id: "activate",
      label: "Activate",
      onClick: async (ids) => {
        const activatedIds = new Set(await activate(ids));
        setSelectedIds((current) => current.filter((id) => !activatedIds.has(id)));
      },
    },
  ],
});
```

`RowAction<TRow>` and the non-generic `SelectionAction` share the non-generic presentation base `DataTableAction` (`id`, `label`, `icon`, `variant`). `RowAction` gains row-based `canApply`; its `isDisabled`, which reads the other way round, is deprecated but still honoured. Bulk eligibility belongs in the consumer's ID-based workflow.

Selection now also remembers loaded selected rows across pages (`selectedRows`), a partial cache rather than the bulk-operation payload. A non-empty `selectionActions` enables selection on its own. The first three actions render as buttons and the rest collapse into a "More actions" menu. On a page-scrolling table the bar sticks to the bottom of the viewport until the table's end scrolls into view.

**Behavior change:** the header checkbox is now page-scoped in both directions. Checking it adds the current page's rows to the selection instead of replacing it, and unchecking it removes only the current page's rows instead of clearing every page. `clearSelection` still empties everything (and is now a no-op when nothing is selected), and the new `deselectAllRows` is the page-scoped counterpart of `selectAllRows`.

The `interaction/multi-select` pattern in the bundled `app-shell-patterns` skill is rewritten around `selectionActions`, replacing the floating bar on a hand-built table.
