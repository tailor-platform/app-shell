---
"@tailor-platform/app-shell": patch
---

Fix `breadcrumbTitle` not being propagated in file-based routing. The `breadcrumbTitle` set in `AppShellPageProps.meta` is now correctly reflected in breadcrumbs, matching the behavior of the `defineResource` API.
