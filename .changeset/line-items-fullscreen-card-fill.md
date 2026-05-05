---
"@tailor-platform/app-shell": patch
---

LineItems: fullscreen mode polish.

- Clicking the dimmed backdrop around the card now closes fullscreen (in addition to the existing Escape-to-close).
- When the table is rendered inside a `Card`, fullscreen now stretches the immediate `Card` child to fill the viewport and expands its `Card.Content` so the `LineItems.Table` scrolls inside the card. Layout rules are scoped via descendant selectors on the fullscreen root, so only `data-slot="card"` / `data-slot="card-content"` are affected.
