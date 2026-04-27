---
"@tailor-platform/app-shell": patch
---

Fix `Select.Async` so it can reopen reliably after loading options without leaving the page scroll-locked.

The async select now cancels in-flight requests on close and opts out of the Base UI modal and anchored alignment paths that could hide the popup on reopen.
