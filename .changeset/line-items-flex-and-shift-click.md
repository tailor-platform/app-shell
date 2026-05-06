---
"@tailor-platform/app-shell": minor
---

LineItems: two related fixes for table interaction and layout consistency.

- **`LineItemsField.flex?: boolean`** — opt-in flag that makes a column absorb leftover horizontal space (typical use: a description / product-name column with the longest content). When at least one field is `flex` (or has no declared `width`), the table drops its trailing spacer and routes leftover space to the flagged column. Tables where every column has an explicit width still get an invisible trailing spacer so column widths stay pixel-exact across pages.
- **Shift-click multi-select fix** — `onCellFocused` no longer overwrites the selection anchor when an input fires its native focus event after a shift-click. Anchor is now owned exclusively by `onCellPointerDown` and the keyboard-nav handlers, so shift-click on a different cell now correctly extends the rectangular selection.
