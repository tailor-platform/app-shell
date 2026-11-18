---
"@tailor-platform/app-shell": patch
---

The sidebar's item list and the icon rail's group flyout scroll more quietly.

- The scrollbar is thin with no track, and shows only while the list is scrolling.
- In the default inset sidebar, it sits on the sidebar's edge instead of 8px inside it, unless the sidebar is resizable, where it keeps clear of the resize handle.
- While there is more to scroll, the bottom of the list fades out, like the top of the page content does.

The global scrollbar style and every other scroll area are unchanged.
