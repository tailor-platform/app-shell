---
"@tailor-platform/app-shell": minor
---

Add typed inline editors to `DataTable` columns with optional `edit.onValueChange` for raw drafts and required `edit.onValueCommitted` for changed, confirmed editor outputs. Enter ends editing in the same cell; Tab confirms and moves between editable cells. Date-time drafts preserve incomplete day/time parts and require explicit Done or Clear.

The consumer owns validation, adoption, persistence, and rollback. Document immediate field saving and collect-then-submit patterns, export the editing option types and `DateTimeDraft`, and retain JavaScript-number-based numeric editing with `.` independently of display locale.

```tsx
column({
  id: "received",
  label: "Received",
  type: "number",
  edit: {
    canEdit: (row) => row.status === "draft",
    onValueCommitted: (row, value) =>
      setRows((current) =>
        current.map((line) => (line.id === row.id ? { ...line, received: value } : line)),
      ),
  },
});
```
