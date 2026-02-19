---
"@tailor-platform/app-shell": minor
---

Adds new Sidebar custom items API for flexible sidebar navigation customization.

## New Components

- `SidebarItem` - Navigation item that auto-resolves title/icon from resource meta
- `SidebarGroup` - Collapsible group for organizing navigation items
- `SidebarSeparator` - Visual separator between sidebar sections
- `WithGuard` - Conditional rendering wrapper based on guard functions

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

## WithGuard Component

New `WithGuard` component for conditional rendering based on guard functions. Use it to control visibility of sidebar items or any other components.

```tsx
import { WithGuard, pass, hidden } from "@tailor-platform/app-shell";

// Define a guard function
const isAdminGuard = ({ contextData }) =>
  contextData.currentUser.role === "admin" ? pass() : hidden();

// Wrap components with WithGuard
<DefaultSidebar>
  <SidebarItem to="/dashboard" />
  <WithGuard guards={[isAdminGuard]}>
    <SidebarGroup title="Admin" icon={<Shield />}>
      <SidebarItem to="/admin/users" />
    </SidebarGroup>
  </WithGuard>
</DefaultSidebar>

// Curried guards for parameterized conditions
const hasRole = (role: string) => ({ contextData }) =>
  contextData.currentUser.role === role ? pass() : hidden();

<WithGuard guards={[hasRole("manager")]}>
  <SidebarItem to="/reports" />
</WithGuard>

// Use in page components for conditional UI
const DashboardPage = () => (
  <div>
    <h1>Dashboard</h1>
    <WithGuard guards={[isAdminGuard]}>
      <AdminPanel />
    </WithGuard>
    <WithGuard guards={[hasRole("editor")]}>
      <EditButton />
    </WithGuard>
  </div>
);
```
