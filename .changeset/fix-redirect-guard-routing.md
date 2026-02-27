---
"@tailor-platform/app-shell": patch
---

Fixed `redirectTo()` guard not working on modules/resources without a component. Index routes are now created for loader-only routes, enabling redirect guards to execute properly.

Fixed sidebar navigation hiding modules/resources that use `redirectTo()` guards. Navigation filtering now only excludes `hidden()` guards, so redirect-guarded items remain visible in the sidebar.
