---
"@tailor-platform/app-shell": minor
---

Add typed inline editors to `DataTable` columns with `edit.canEdit`, `edit.options`, and `edit.onValueChange`. Editors notify parsed values on Enter, Tab, blur, or selection. Enter confirms without moving focus; Tab moves between editable cells. The consumer owns validation, data updates, persistence, and rollback.

```tsx
column({
  id: "received",
  label: "Received",
  type: "number",
  edit: {
    canEdit: (row) => row.status === "draft",
    onValueChange: (row, value) =>
      setRows((current) =>
        current.map((line) => (line.id === row.id ? { ...line, received: value } : line)),
      ),
  },
});
```
