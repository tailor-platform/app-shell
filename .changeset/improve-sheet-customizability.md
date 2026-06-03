---
"@tailor-platform/app-shell": minor
---

Improve Sheet component customizability:

- Add `size` prop to `Sheet.Content` for width variations (`sm`, `md`, `lg`, `xl`, `full`)
- Add `action` prop to `Sheet.Header` for placing action buttons to the right of the title
- Increase `Sheet.Title` font size to `text-lg` for better visibility
- Move close button to the left side of the header, with title inline next to it
- Header now has a bottom border, Footer has a top border for visual separation

```tsx
<Sheet.Root side="right">
  <Sheet.Trigger render={<Button />}>Open</Sheet.Trigger>
  <Sheet.Content size="lg">
    <Sheet.Header action={<Button size="sm">Save</Button>}>
      <Sheet.Title>Edit Record</Sheet.Title>
    </Sheet.Header>
  </Sheet.Content>
</Sheet.Root>
```
