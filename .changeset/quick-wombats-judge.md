---
"@tailor-platform/app-shell": minor
---

Add `header` to DataTable columns so consumers can fully customize header UI while keeping the built-in header behavior when `header` is omitted.

```tsx
column({
  label: "Amount",
  sort: { field: "amount", type: "number" },
  header: (ctx) =>
    ctx.sortable ? (
      <button type="button" onClick={ctx.activateSort}>
        {ctx.label} {ctx.sortDirection === "Asc" ? "▲" : ctx.sortDirection === "Desc" ? "▼" : null}
      </button>
    ) : (
      ctx.label
    ),
});
```

`header` is a typed render function. Non-sortable columns receive `{ label, sortable: false }`; sortable columns also receive `sortDirection` and `activateSort()`. Custom headers own their click surface and sort indicator, while the default header keeps the built-in sort button and hit area.
