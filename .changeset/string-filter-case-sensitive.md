---
"@tailor-platform/app-shell": minor
---

Add case-sensitivity control for string filters in `DataTable.Filters`. String filters are now case-insensitive by default (using Tailor Platform's `regex` operator with `(?i)` prefix). A "Case sensitive" checkbox allows users to opt into exact-case matching.

The `Filter` type and `CollectionControl.addFilter` now accept an optional `caseSensitive` property to control this behavior programmatically.
