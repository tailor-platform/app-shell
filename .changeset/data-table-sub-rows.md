---
"@tailor-platform/app-shell": minor
---

Add `subRows` to `DataTable`, for nested rows such as a chart of accounts or a bill of materials.

```tsx
const table = useDataTable<Account>({
  columns,
  data,
  subRows: { getSubRows: (account) => account.children },
  rowSelection: { actions: [exportAccounts] },
});
```

- **Hierarchy column:** the first column (or the one `subRows.column` names) carries the indent, the open / close caret and, when selection propagates, the checkbox. It's locked first and pinned left, and column settings won't let it be hidden, unpinned or moved.
- **Pagination:** the page's rows are the top level, and each parent's sub-rows stay on its page.
- **Selection:** `rowSelection` takes the same `selectionStrategy` as `Tree`, defaulting to `"leaves"`. With `"independent"`, rows are ticked on their own and the checkboxes stay in the left-hand column.
- **Open rows:** controlled with `expandedIds` + `onExpandedChange`, or started with `defaultExpandedIds`.
- `subRows` can't be combined with `rowExpansion`: passing both is a type error.
