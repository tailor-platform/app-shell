---
title: SidebarLayout
description: The default layout component with sidebar navigation, breadcrumbs, and theme toggle
---

# SidebarLayout

`SidebarLayout` is the default layout component that provides a responsive sidebar navigation, breadcrumb trail, and theme toggle. It's designed to work seamlessly with AppShell's module system.

## Import

```tsx
import { SidebarLayout } from "@tailor-platform/app-shell"
```

## Basic Usage

```tsx
import { AppShell, SidebarLayout } from "@tailor-platform/app-shell"

function App() {
  return (
    <AppShell modules={modules}>
      <SidebarLayout />
    </AppShell>
  )
}
```

This gives you:

- ✅ Responsive sidebar with auto-generated navigation from modules
- ✅ Breadcrumb navigation
- ✅ Theme toggle (light/dark mode)
- ✅ Mobile-friendly collapsible sidebar

## Props

### children

- **Type:** `(props: { Outlet: () => React.ReactNode }) => React.ReactNode` (optional)
- **Description:** Custom content renderer for adding headers, footers, or wrapping the outlet

```tsx
<SidebarLayout>
  {({ Outlet }) => (
    <>
      <CustomHeader />
      <Outlet />
      <CustomFooter />
    </>
  )}
</SidebarLayout>
```

The `Outlet` component renders your current route's component.

### sidebar

- **Type:** `React.ReactNode` (optional)
- **Default:** `<DefaultSidebar />`
- **Description:** Custom sidebar content

```tsx
import { SidebarLayout, DefaultSidebar, SidebarItem } from "@tailor-platform/app-shell"
;<SidebarLayout
  sidebar={
    <DefaultSidebar>
      <SidebarItem label="Custom Link" href="/custom" />
    </DefaultSidebar>
  }
/>
```

## Features

### Responsive Sidebar

The sidebar automatically adapts to different screen sizes:

- **Desktop** (≥ 768px): Full sidebar visible by default
- **Tablet/Mobile** (< 768px): Collapsible sidebar with hamburger menu

Users can toggle the sidebar using:

- Hamburger menu button (top left)
- Keyboard shortcut: `Cmd + B` / `Ctrl + B`

### Breadcrumb Navigation

Breadcrumbs are automatically generated based on the current route:

```
Dashboard > Products > Product Details
```

Breadcrumbs update automatically as users navigate through your application.

### Theme Toggle

A sun/moon icon button in the header allows users to switch between light and dark themes. The theme preference is persisted to localStorage.

## Customization Examples

### Custom Header and Footer

```tsx
import { SidebarLayout } from "@tailor-platform/app-shell"

const CustomHeader = () => (
  <div className="astw:bg-blue-500 astw:text-white astw:p-4">
    <h2>Welcome to My App</h2>
  </div>
)

const CustomFooter = () => (
  <footer className="astw:p-4 astw:text-sm astw:text-gray-600">© 2026 My Company</footer>
)

function App() {
  return (
    <AppShell modules={modules}>
      <SidebarLayout>
        {({ Outlet }) => (
          <div className="astw:flex astw:flex-col astw:h-full">
            <CustomHeader />
            <main className="astw:flex-1 astw:overflow-auto">
              <Outlet />
            </main>
            <CustomFooter />
          </div>
        )}
      </SidebarLayout>
    </AppShell>
  )
}
```

### Custom Sidebar

```tsx
import {
  SidebarLayout,
  DefaultSidebar,
  SidebarItem,
  SidebarGroup,
  SidebarSeparator,
} from "@tailor-platform/app-shell"
import { HelpCircle, ExternalLink } from "lucide-react"

function App() {
  return (
    <AppShell modules={modules}>
      <SidebarLayout
        sidebar={
          <DefaultSidebar>
            {/* Auto-generated navigation from modules */}

            {/* Add custom items */}
            <SidebarSeparator />
            <SidebarGroup label="Help">
              <SidebarItem
                label="Documentation"
                icon={<HelpCircle />}
                href="https://docs.example.com"
                external
              />
              <SidebarItem
                label="Support"
                icon={<ExternalLink />}
                href="https://support.example.com"
                external
              />
            </SidebarGroup>
          </DefaultSidebar>
        }
      />
    </AppShell>
  )
}
```

### Wrapping Content in a Container

```tsx
<SidebarLayout>
  {({ Outlet }) => (
    <div className="astw:container astw:mx-auto astw:p-6 astw:max-w-7xl">
      <Outlet />
    </div>
  )}
</SidebarLayout>
```

### Adding a Global Banner

```tsx
<SidebarLayout>
  {({ Outlet }) => (
    <>
      <div className="astw:bg-yellow-100 astw:border-b astw:border-yellow-200 astw:p-3 astw:text-center">
        <p className="astw:text-sm">🎉 New features available! Check out our latest updates.</p>
      </div>
      <Outlet />
    </>
  )}
</SidebarLayout>
```

## Layout Structure

The SidebarLayout component creates the following structure:

```
┌─────────────────────────────────────────────┐
│ Sidebar          │ Header (Breadcrumbs +   │
│                  │         Theme Toggle)    │
│ - Dashboard      ├─────────────────────────┤
│ - Products       │                         │
│ - Orders         │                         │
│                  │      Page Content       │
│ [Settings ▼]     │        (Outlet)         │
│                  │                         │
│                  │                         │
└─────────────────────────────────────────────┘
```

Mobile view (sidebar collapsed):

```
┌─────────────────────────────────┐
│ [☰] Breadcrumbs     [Theme]     │
├─────────────────────────────────┤
│                                 │
│         Page Content            │
│           (Outlet)              │
│                                 │
└─────────────────────────────────┘
```

## Styling

The sidebar and layout use Tailwind CSS classes prefixed with `astw:` to avoid conflicts with your application styles.

To customize the appearance, you can:

1. **Override CSS variables** in your theme.css:

   ```css
   :root {
     --sidebar-width: 280px; /* Default: 256px */
   }
   ```

2. **Use custom sidebar component** with your own styling

3. **Wrap Outlet** with container classes as shown in examples above

## Accessibility

SidebarLayout includes built-in accessibility features:

- **Keyboard navigation**: Navigate sidebar items with arrow keys
- **ARIA labels**: Proper labels for screen readers
- **Focus management**: Focus trap when sidebar is open on mobile
- **Responsive**: Works with keyboard and touch inputs

## Related Components

- [AppShell](./app-shell.md) - Root component
- [DefaultSidebar](./sidebar-item.md) - Default sidebar component
- [SidebarItem](./sidebar-item.md) - Individual sidebar navigation items
- [SidebarGroup](./sidebar-group.md) - Group sidebar items

## Related Concepts

- [Modules and Resources](../concepts/modules-and-resources.md) - How navigation is generated
- [Routing and Navigation](../concepts/routing-navigation.md) - Navigation between pages
- [Styling and Theming](../concepts/styling-theming.md) - Customize appearance

## API Reference

- [useTheme](../api/use-theme.md) - Access theme context
