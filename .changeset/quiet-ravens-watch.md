---
"@tailor-platform/app-shell": patch
---

Use the current viewport for the sidebar's first client-only render instead of initially treating mobile and tablet widths as desktop.
Existing breakpoints and the desktop fallback during server rendering and initial hydration remain unchanged.
