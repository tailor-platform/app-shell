---
"@tailor-platform/app-shell": patch
---

Fix DataTable pinned columns changing hover and selected background colors at a different timing than scrollable columns.

Sticky body cells now use the same color transition behavior as the rest of the row, so hover feedback feels consistent across pinned and non-pinned columns.
