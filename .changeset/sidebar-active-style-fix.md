---
"@tailor-platform/app-shell": patch
---

Fix `DefaultSidebar` not applying active style when `basePath` is not specified. The sidebar now correctly normalizes URLs before comparing with the current pathname, ensuring the active highlight appears on the correct menu item.
