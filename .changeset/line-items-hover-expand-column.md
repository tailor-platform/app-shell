---
"@tailor-platform/app-shell": minor
---

LineItems: column-level `width` and `hoverExpandWidth` options.

- New `LineItemsField.width` sets a resting pixel width for the column (otherwise auto-sized).
- New `LineItemsField.hoverExpandWidth` widens the column to that pixel value while the user hovers any cell (header or body) in that column, with a subtle 220ms `width` / `min-width` transition. Useful for dense columns that show truncated content (e.g. a SKU label that includes the product name).
