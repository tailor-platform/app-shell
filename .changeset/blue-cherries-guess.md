---
"@tailor-platform/app-shell": patch
---

Show the DataTable first-page button even when the backend does not return a total count.

This keeps cursor-based pagination usable for datasets that support going back to the first page but do not know the last page.
