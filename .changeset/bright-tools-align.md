---
"@tailor-platform/app-shell": minor
---

Add a full-width `Toolbar` with composable rows, grouped controls, separators, and optional edge-to-edge row layout.

```tsx
<Toolbar.Root>
  <Toolbar.Row justify="between" aria-label="List actions">
    <Toolbar.Group>
      <DataTable.Filters />
    </Toolbar.Group>
    <Toolbar.Group>
      <DataTable.ColumnSettings />
    </Toolbar.Group>
  </Toolbar.Row>
</Toolbar.Root>
```

AppShell Buttons, inputs, selects, comboboxes, and tabs automatically participate in toolbar keyboard navigation.
