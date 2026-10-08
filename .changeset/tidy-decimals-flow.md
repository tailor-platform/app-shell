---
"@tailor-platform/app-shell": patch
"@tailor-platform/sdk-plugin-app-shell": patch
---

Fix Decimal metadata and query types to use strings with numeric sort/filter operators, matching the GraphQL Decimal scalar.
Preserve decimal precision when adding, editing, or restoring DataTable filters. Regenerate SDK metadata to update decimal fields previously marked as `number`.
