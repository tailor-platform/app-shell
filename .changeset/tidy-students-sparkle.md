---
"@tailor-platform/app-shell": minor
---

Make `Sheet` omit its backdrop automatically when `modal={false}` so non-modal sheets no longer dim or block the page.

```tsx
<Sheet.Root modal={false}>
  <Sheet.Content>...</Sheet.Content>
</Sheet.Root>
```
