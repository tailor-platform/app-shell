---
"@tailor-platform/app-shell": minor
---

Add `header` to DataTable columns so consumers can customize header content with icons, styled text, and sort-aware UI.

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

Function headers receive a typed `HeaderRenderContext`: non-sortable columns only get `{ label, sortable: false }`, while sortable columns also get `sortDirection` and `activateSort()`. When you provide a function header, that renderer owns the sort click surface via `ctx.activateSort()`.
