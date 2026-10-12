---
"@tailor-platform/app-shell": patch
---

`Dialog` opens with a small upward slide alongside its fade and zoom, and closes faster (150ms, eased in) with a matching slide down, so opening and closing read more clearly. Both animations are skipped under `prefers-reduced-motion`.
