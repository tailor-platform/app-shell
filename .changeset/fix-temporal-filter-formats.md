---
"@tailor-platform/app-shell": patch
---

Fix DataTable filter types for `datetime` and `time` fields. Previously these were incorrectly mapped to the `date` filter type, causing wrong input formats. Each temporal type now uses its proper HTML input type (`datetime-local`, `date`, `time`) and format handling.
