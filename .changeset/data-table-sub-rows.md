---
"@tailor-platform/app-shell": minor
---

Add `subRows` to `DataTable`, for nested rows such as a chart of accounts or a bill of materials.

```tsx
const table = useDataTable<Account>({
  columns,
  data,
  subRows: {
    getSubRows: (account) => account.children,
    hierarchyColumn: { label: "Account", accessor: (account) => account.name },
  },
  rowSelection: { actions: [exportAccounts] },
});
```

- **Hierarchy column:** `subRows.hierarchyColumn` defines a column of its own that carries the indent, the open / close caret, the checkbox and the row's label. Like the row-actions column, it's added by the feature: always first and pinned left, outside column settings and saved layout, and your other columns stay as defined. It takes the regular column display options (`label`, `accessor`, `render`, `type`, `width`, `truncate`, `header`, `footer` and the props hooks).
- **Pagination:** the page's rows are the top level, and each parent's sub-rows stay on its page.
- **Selection:** `rowSelection` takes the same `selectionStrategy` as `Tree`, defaulting to `"leaves"`. With `"independent"`, rows are ticked on their own and the checkboxes stay in the left-hand column.
- **Open rows:** controlled with `expandedIds` + `onExpandedChange`, or started with `defaultExpandedIds`.
- `subRows` can't be combined with `rowExpansion`: passing both is a type error.
