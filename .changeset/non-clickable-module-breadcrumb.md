---
"@tailor-platform/app-shell": minor
---

Render module-level breadcrumb segments as non-clickable text when the module has no component.
Modules defined without a `component` (group-only modules) now display their breadcrumb as plain text instead of a link, preventing navigation to non-existent pages.
