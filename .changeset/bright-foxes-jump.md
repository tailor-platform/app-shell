---
"@tailor-platform/app-shell": patch
---

Fix root page (`/`) showing "/" as the sidebar title when `appShellPageProps.meta.title` is not set. The title now correctly falls back to "Home" instead of "/".
