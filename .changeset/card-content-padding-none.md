---
"@tailor-platform/app-shell": minor
---

Add `padding="none"` to `Card.Content` for edge-to-edge content such as a `Table`, `DataTable` or divided list.

```tsx
<Card.Root>
  <Card.Header title="Line items" />
  <Card.Content padding="none">
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  </Card.Content>
</Card.Root>
```

Cells keep their own 24px inset, so the first column lines up with the card title. Row backgrounds stay inside the card's rounded corners, and a nested `DataTable` drops its own border. This replaces the `className="px-0!"` workaround.
