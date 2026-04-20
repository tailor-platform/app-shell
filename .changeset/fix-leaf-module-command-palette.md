---
"@tailor-platform/app-shell": patch
---

Fix CommandPalette and DefaultSidebar not showing top-level pages that have no child pages.

When using file-based routing with a flat page structure (e.g. `pages/dashboard/page.tsx` with no sub-pages), those pages were silently excluded from the CommandPalette and the DefaultSidebar auto-generation. They now appear correctly as navigable entries.
