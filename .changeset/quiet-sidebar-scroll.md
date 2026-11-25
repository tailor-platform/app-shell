---
"@tailor-platform/app-shell": patch
---

The sidebar's item list and the icon rail's group flyout scroll more quietly.

- The scrollbar is thin with no track, and shows only while the list is scrolling.
- In the default inset sidebar, it sits on the sidebar's edge instead of 8px inside it, including when the sidebar is resizable.
- The resize handle's hit area now starts at the sidebar's edge instead of overlapping its last 6px, so it no longer covers the scrollbar. The handle's pill stays where it was.
- While there is more to scroll, the bottom of the list fades out, like the top of the page content does.

The global scrollbar style and every other scroll area are unchanged.
