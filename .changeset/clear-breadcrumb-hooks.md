---
"@tailor-platform/app-shell": patch
---

Fix the `usePageMeta` breadcrumb example to call the hook at the top level of a child component
instead of inside a `map` callback.
