---
"@tailor-platform/app-shell": patch
---

Fix localized breadcrumb overrides by recognizing translation functions created by `labels.t()` and resolving callback-returned `LocalizedString` values using the current AppShell locale. This applies to modules, resources, and file-based page metadata while preserving existing URL-segment callbacks.

Use `breadcrumbTitle: labels.t("orders")` directly, or `breadcrumbTitle: (segment) => labels.t("order", { id: segment })` for dynamic labels, without `as string`. The existing `() => labels.t(key)` form remains supported.
