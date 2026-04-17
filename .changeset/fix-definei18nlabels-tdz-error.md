---
"@tailor-platform/app-shell": patch
---

Fix TDZ (Temporal Dead Zone) error when calling `defineI18nLabels` at module top-level in production builds.

Calling `defineI18nLabels` at module top-level (as shown in documentation examples) caused a runtime "Cannot access before initialization" error in production builds (e.g., `vite build`). This was caused by a circular module dependency introduced in v0.34.0. The issue did not occur in development mode.
