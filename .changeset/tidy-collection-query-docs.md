---
"@tailor-platform/app-shell": patch
---

Clarify that collection hooks return `variables.query` as `undefined` when no filters are active.
Document `variables.query ?? {}` for callers that need an object; runtime behavior and public types are unchanged.
