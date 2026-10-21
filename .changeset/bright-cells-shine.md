---
"@tailor-platform/app-shell": minor
---

Add row-aware `cellProps` and static `headerProps` to DataTable columns to set `className`, `style`, and `title` on the entire data/header cell, including padding.
Inline body-cell backgrounds remain visible on hover and selection, including in pinned columns. Header content, sorting, and context menus keep their existing behavior; existing tables are unchanged.

```tsx
column({
  id: "hours",
  type: "number",
  headerProps: {
    style: { backgroundColor: "var(--muted)" },
    title: "Monthly overtime hours",
  },
  cellProps: (row) =>
    row.hours >= 60
      ? {
          style: { backgroundColor: "var(--danger-solid)", color: "var(--danger-contrast)" },
          title: "Overtime threshold exceeded",
        }
      : undefined,
});
```
