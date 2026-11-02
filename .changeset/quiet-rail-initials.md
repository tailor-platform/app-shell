---
"@tailor-platform/app-shell": patch
---

Refine the title-initial fallback for icon-less `SidebarItem` and `SidebarGroup` in the collapsed icon rail. The initial is now larger and sits in a 22px box with a subtle 0.5px hairline frame (20% of the text color) instead of a heavy 2px outline, so it stays legible for dense CJK characters such as 請 or 発.
