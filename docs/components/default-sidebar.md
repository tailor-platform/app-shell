---
title: DefaultSidebar
description: Pre-built sidebar component that renders navigation from AppShell modules
---

# DefaultSidebar

The default sidebar component that automatically renders navigation items from the AppShell context. This is a convenience component that provides a ready-to-use sidebar without manual configuration.

## Props

| Prop     | Type              | Required | Description           |
| -------- | ----------------- | -------- | --------------------- |
| `header` | `React.ReactNode` | No       | Custom header content |
| `footer` | `React.ReactNode` | No       | Custom footer content |

## Usage

### Basic Usage

```typescript
import { DefaultSidebar } from "@tailor-platform/app-shell";

function Layout() {
  return <DefaultSidebar />;
}
```

### With Custom Header

```typescript
import { DefaultSidebar } from "@tailor-platform/app-shell";

function CompanyLogo() {
  return (
    <div className="p-4">
      <img src="/logo.svg" alt="Company" />
    </div>
  );
}

function Layout() {
  return <DefaultSidebar header={<CompanyLogo />} />;
}
```

### With Custom Footer

```typescript
function UserProfile() {
  const { context } = useAppShell();

  return (
    <div className="p-4 border-t">
      <p>{context.currentUser?.name}</p>
      <button>Logout</button>
    </div>
  );
}

function Layout() {
  return <DefaultSidebar footer={<UserProfile />} />;
}
```

### With Both Header and Footer

```typescript
function Layout() {
  return (
    <DefaultSidebar
      header={<CompanyLogo />}
      footer={<UserProfile />}
    />
  );
}
```

## Features

- **Auto-Navigation**: Automatically renders all modules and resources from AppShell
- **Active State**: Highlights the current route
- **Collapsible Groups**: Supports nested resource groups
- **Responsive**: Adapts to mobile and desktop layouts
- **Customizable**: Add header/footer content as needed

## Using in SidebarLayout

The `DefaultSidebar` is commonly used with `SidebarLayout`:

```typescript
import { SidebarLayout, DefaultSidebar } from "@tailor-platform/app-shell";

<SidebarLayout
  sidebar={
    <DefaultSidebar
      header={<Logo />}
      footer={<UserMenu />}
    />
  }
>
  <Outlet />
</SidebarLayout>
```

## Custom Navigation

If you need more control over navigation rendering, build a custom sidebar using:

- [SidebarItem](./sidebar-item.md) - Individual navigation links
- [SidebarGroup](./sidebar-group.md) - Collapsible navigation groups
- [WithGuard](./with-guard.md) - Conditional rendering based on access control

```typescript
import { SidebarItem, SidebarGroup } from "@tailor-platform/app-shell";

function CustomSidebar() {
  return (
    <div>
      <SidebarItem to="/dashboard" />
      <SidebarGroup title="Products">
        <SidebarItem to="/products/all" />
        <SidebarItem to="/products/create" />
      </SidebarGroup>
    </div>
  );
}
```

## Related

- [SidebarLayout](./sidebar-layout.md) - Layout wrapper for sidebar + content
- [SidebarItem](./sidebar-item.md) - Individual navigation links
- [SidebarGroup](./sidebar-group.md) - Collapsible navigation groups
- [Sidebar Navigation](../concepts/sidebar-navigation.md) - Complete navigation guide
