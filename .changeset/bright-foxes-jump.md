---
"@tailor-platform/app-shell": minor
---

Fix root page (`/`) showing `"/"` as its title in `SidebarItem` and breadcrumb. 

The root page is now treated as a first-class page (module) so that title, icon, and guards are resolved consistently. `DefaultSidebar` and `CommandPalette` now include the root page when it is defined. When no title is set, the fallback is localized `"Home"` / `"ホーム"`.
