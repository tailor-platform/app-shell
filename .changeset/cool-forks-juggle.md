---
"@tailor-platform/app-shell": patch
---

Restore the `@tailor-platform/app-shell/theme.css` export as a no-op compatibility shim.

Apps that still import `@tailor-platform/app-shell/theme.css` alongside `@tailor-platform/app-shell/styles` now keep building while the real theme tokens continue to come from `styles`.
