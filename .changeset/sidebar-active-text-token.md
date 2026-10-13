---
"@tailor-platform/app-shell": patch
---

Fix the selected sidebar item ignoring `--sidebar-accent-foreground`. `SidebarItem`, linked `SidebarGroup` headers, and the auto-generated sidebar now mark the current page's button as active (`data-active="true"`), so its background, weight, and text colour all follow the sidebar accent tokens. Built-in themes look the same; themes that set a distinct `--sidebar-accent-foreground` now show it without a custom `render` workaround. Refs tailor-inc/platform-planning#1946.
