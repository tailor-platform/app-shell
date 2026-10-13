---
"@tailor-platform/app-shell": patch
---

Normalize datetime filters in metadata-backed collection hooks before initial queries and filter updates, including URL and saved-view restoration. Interpret timezone-less values in the AppShell timezone and reject invalid datetime values without dropping filter constraints; hooks without metadata remain unchanged.

Use the AppShell timezone consistently for built-in DataTable date cells and cell-menu filters, while preserving date-only calendar values. Reuse date formatters per column across rows and unchanged-column renders instead of constructing them for every cell.
