---
"@tailor-platform/app-shell": patch
---

Fixed two issues related to `redirectTo()` guards in the declarative API:

- Fixed `redirectTo()` guard not working on modules/resources without a component. Index routes with a loader are now created for routes that only have guards (no component), so redirect guards execute properly when navigating to the route path.
- Fixed sidebar navigation hiding modules/resources that use `redirectTo()` guards. Navigation filtering now only excludes `hidden()` guards, so redirect-guarded items remain visible in the sidebar.
