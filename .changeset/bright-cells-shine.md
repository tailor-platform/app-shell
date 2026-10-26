---
"@tailor-platform/app-shell": minor
---

Add `cellProps(row)`, `headerProps(ctx)`, and `footerProps(ctx)` callbacks to DataTable columns to set `className`, `style`, and `title` on the entire data/header/footer cell, including padding. Each can return `undefined` to keep the defaults; `headerProps` receives the same label and sort context as `header`, and `footerProps` receives the same current-page `rows` as `footer`.
Inline body-cell backgrounds remain visible on hover and selection, including in pinned columns. Footer styling is skipped during loading and errors and for hidden columns; it does not create a footer row by itself. Content, sorting, and context menus keep their existing behavior; existing tables are unchanged.

```tsx
column({
  id: "hours",
  type: "number",
  headerProps: () => ({
    style: { backgroundColor: "var(--muted)" },
    title: "Monthly overtime hours",
  }),
  footer: ({ rows }) => rows.reduce((sum, row) => sum + row.hours, 0),
  footerProps: ({ rows }) => ({
    style: { backgroundColor: "var(--muted)" },
    title: `Total overtime for ${rows.length} rows on this page`,
  }),
  cellProps: (row) =>
    row.hours >= 60
      ? {
          style: { backgroundColor: "var(--danger-solid)", color: "var(--danger-contrast)" },
          title: "Overtime threshold exceeded",
        }
      : undefined,
});
```
