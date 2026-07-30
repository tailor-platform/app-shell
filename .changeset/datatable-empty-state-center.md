---
"@tailor-platform/app-shell": patch
---

Fix `DataTable` empty/error-state message not being vertically centered — it now
centers in the reserved area instead of sitting near the top. The message was
positioned with `position: sticky`, whose offset only applies while scrolling,
so in the common (non-scrolling) case it stayed at the top of the cell; it now
uses `vertical-align: middle`.
