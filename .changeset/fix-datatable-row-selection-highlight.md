---
"@tailor-platform/app-shell": patch
---

Fix DataTable row-selection highlight. Selecting a row now tints the **whole** row, not just the pinned selection/actions cells. The row sets `data-state="selected"` (which `Table.Row` keys its selected background off of) in addition to the existing `aria-selected`; previously only the pinned cells — which carry their own `group-aria-selected:bg-muted` — were highlighted.
