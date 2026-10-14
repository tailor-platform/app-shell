---
"@tailor-platform/app-shell": minor
---

Add `SidebarSection` for grouping flat sidebar navigation items under a static heading. Unlike `SidebarGroup`, a section is neither collapsible nor navigable, and its items keep top-level styling. In the icon rail the heading is hidden. Combine it with `SidebarSeparator` to add dividers.

`SidebarSeparator` now adds 4px of space above the line and 8px below it, so the items after a separator read as a new section. Sidebars that already use `SidebarSeparator` get this extra spacing.

```tsx
<DefaultSidebar>
  <SidebarItem to="/overview" />
  <SidebarSeparator />
  <SidebarSection title="Services">
    <SidebarItem to="/ai-gateways" />
    <SidebarItem to="/applications" />
  </SidebarSection>
</DefaultSidebar>
```
