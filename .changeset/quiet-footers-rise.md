---
"@tailor-platform/app-shell": minor
---

Add bulk actions to `DataTable`. Pass `selectionActions` to `useDataTable` and, while rows are selected, `DataTable.Footer` becomes a bulk-action bar: the selection count, your actions, and a Clear button, with pagination kept alongside. Give an action `appliesTo` to scope it to the selected rows it can act on — the bar shows that count, disables the action at zero, and hands only those rows to `onClick`.

```tsx
const table = useDataTable({
  columns,
  data,
  control,
  selectionActions: [
    {
      id: "activate",
      label: "Activate",
      appliesTo: (vendor) => vendor.status === "inactive",
      onClick: (vendors, { clearSelection }) => {
        activate(vendors);
        clearSelection();
      },
    },
  ],
});
```

Selection now also remembers the rows it holds across pages (`selectedRows`), and a non-empty `selectionActions` enables selection on its own. The first three actions render as buttons and the rest collapse into a "More actions" menu. On a page-scrolling table the bar sticks to the bottom of the viewport until the table's end scrolls into view.

**Behavior change:** the header checkbox is now page-scoped in both directions. Checking it adds the current page's rows to the selection instead of replacing it, and unchecking it removes only the current page's rows instead of clearing every page. `clearSelection` still empties everything, and the new `deselectAllRows` is the page-scoped counterpart of `selectAllRows`.

The `interaction/multi-select` pattern in the bundled `app-shell-patterns` skill is rewritten around `selectionActions`, replacing the floating bar on a hand-built table.
