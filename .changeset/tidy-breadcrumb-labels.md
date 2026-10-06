---
"@tailor-platform/app-shell": patch
---

Fix localized breadcrumb overrides by allowing `meta.breadcrumbTitle` callbacks to return a `LocalizedString`, resolved using the current AppShell locale. This applies to modules, resources, and file-based page metadata while preserving existing URL-segment callbacks.

Use `breadcrumbTitle: () => labels.t("orders")` or `breadcrumbTitle: (segment) => labels.t("order", { id: segment })` without `as string`. Unlike `meta.title`, the outer callback still receives the URL segment, so do not pass `labels.t(key)` directly.
