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

- `usePageMeta` - Hook to access current page metadata (title, icon)

## Usage

```tsx
import {
  SidebarLayout,
  DefaultSidebar,
  SidebarItem,
  SidebarGroup,
  SidebarSeparator,
} from "@tailor-platform/app-shell";

// Auto-resolved navigation from resource definitions (DefaultSidebar is used by default)
<SidebarLayout />

// Fully customized sidebar navigation
<SidebarLayout
  sidebar={
    <DefaultSidebar>
      <SidebarItem to="/dashboard" />
      <SidebarSeparator />
      <SidebarGroup title="Products" icon={<Package />}>
        <SidebarItem to="/products/all" />
        <SidebarItem to="/products/categories" />
      </SidebarGroup>
      <SidebarItem to="https://docs.example.com" external />
    </DefaultSidebar>
  }
/>

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
const isAdminGuard = ({ context }) =>
  context.currentUser.role === "admin" ? pass() : hidden();

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
const hasRole = (role: string) => ({ context }) =>
  context.currentUser.role === role ? pass() : hidden();

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

## Breaking Change: Module without component requires guards

As part of the ongoing effort to decouple navigation and routing (aligned with file-based routing), the automatic redirect behavior for modules without a `component` has been removed.

Previously, a module without a `component` would automatically redirect to the first visible resource. However, in file-based routing, the resource hierarchy is determined ad-hoc by the vite-plugin based on directory structure, making this implicit redirect behavior inconsistent and unpredictable. To maintain consistency across both explicit and file-based routing, this behavior has been removed.

If a module is defined without both `component` and `guards`, an error will be thrown at runtime. You must provide at least one of them.

```tsx
// Before: automatic redirect to first visible resource
defineModule({
  path: "reports",
  resources: [salesResource, usersResource],
});

// After: explicit redirect via guards
defineModule({
  path: "reports",
  guards: [() => redirectTo("sales")],
  resources: [salesResource, usersResource],
});

// Error: defining a module without both component and guards will throw
defineModule({
  path: "reports",
  resources: [salesResource, usersResource],
}); // => throws an error
```
