---
"@tailor-platform/app-shell": patch
---

Fix image preview Blob URLs leaking when `useAttachment` unmounts after a successful `applyChanges()` call.
Previews remain available while displayed and are released on deletion or unmount.
