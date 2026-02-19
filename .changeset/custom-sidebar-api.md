---
"@tailor-platform/app-shell": minor
---

Adds new Sidebar custom items API for flexible sidebar navigation customization.

## New Components

- `SidebarItem` - Navigation item that auto-resolves title/icon from resource meta
- `SidebarGroup` - Collapsible group for organizing navigation items
- `SidebarSeparator` - Visual separator between sidebar sections

## New Hook

- `usePageMeta` - Hook to access current page metadata (title, icon, path segments)

## Usage

```tsx
import {
  SidebarLayout,
  DefaultSidebar,
  SidebarItem,
  SidebarGroup,
  SidebarSeparator,
} from "@tailor-platform/app-shell";

// Auto-resolved navigation from resource definitions
<SidebarLayout>
  <DefaultSidebar />
</SidebarLayout>

// Fully customized sidebar navigation
<SidebarLayout>
  <DefaultSidebar>
    <SidebarItem to="/dashboard" />
    <SidebarSeparator />
    <SidebarGroup title="Products" icon={<Package />}>
      <SidebarItem to="/products/all" />
      <SidebarItem to="/products/categories" />
    </SidebarGroup>
    <SidebarItem to="https://docs.example.com" external />
  </DefaultSidebar>
</SidebarLayout>

// Custom rendering with render prop
<SidebarItem
  to="/tasks"
  render={({ title, icon, isActive }) => (
    <div className={isActive ? "active" : ""}>
      {icon} {title}
    </div>
  )}
/>
```
