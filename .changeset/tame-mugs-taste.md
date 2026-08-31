---
"@tailor-platform/app-shell": patch
---

Fix the Vite 8 build output so the browser no longer crashes on `require("react")` when consuming the ESM package.

This keeps external dependencies browser-safe under Rolldown while preserving library externalization.
