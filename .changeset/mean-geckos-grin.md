---
"@tailor-platform/app-shell": patch
---

Fix a `Select.Async` bug where reopening the dropdown after the first async load could leave the popup invisible while the page stayed scroll-locked.

This could happen after options were fetched once, the dropdown was closed, and then opened again. The fix cancels in-flight requests on close and avoids the Base UI modal and anchored alignment paths that were leaving the async popup in that broken reopen state.
