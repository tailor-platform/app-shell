---
"@tailor-platform/app-shell": patch
---

Keep redirecting pages and their visible descendants in automatic sidebar navigation and Command Palette entries, including current-path-aware dynamic routes.
Include redirect-only pages as links to their original paths even without a component. Hidden guards continue to exclude their subtrees.
