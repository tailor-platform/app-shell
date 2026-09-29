---
"@tailor-platform/app-shell": patch
---

Fix `SidebarItem` title overrides accepting localized strings. Pass a value from `defineI18nLabels` directly to `title` and it resolves with the active AppShell locale.
