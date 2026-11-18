---
"@tailor-platform/app-shell": minor
---

Add `EditableCard` for editing part of a record in place. View and edit are one card with one field list, so every field keeps its exact position when Edit is pressed and only its value turns into a control. Fields the user can't change keep their view rendering and show a hint icon whose tooltip gives the reason (`readOnly={{ kind: "system" | "calculated" | "locked" | "permission", reason }}`); an empty value shows a dash. Save submits only that card, after the fields pass validation; an async `onSave` keeps the card in edit mode until it resolves, and a rejected or throwing `onSave` keeps it there with the user's changes. Pass server errors back through `errors` to show them under their fields. Type the saved values with a type argument (`<EditableCard<OrderValues>>`). Edit moves focus to the first control; Cancel or Escape (which also calls `onCancel`) and a successful save return it to Edit.

```tsx
<EditableCard<OrderValues> title="Order details" errors={errors} onSave={saveOrder}>
  <EditableCard.Field
    label="Status"
    value={<Badge variant="outline-info">Confirmed</Badge>}
    readOnly={{ reason: "Changes as the order moves through approval." }}
  />
  <EditableCard.Field name="shipTo" label="Ship to" value={order.shipTo}>
    <Select items={warehouses} defaultValue={order.shipTo} />
  </EditableCard.Field>
</EditableCard>
```
