---
kind: code-backed
group: default-sidebar
title: DefaultSidebar
description: Built-in sidebar component for auto-generated or composed navigation, with optional search suppression and icon-rail mode
sources:
  - packages/core/src/components/sidebar/default-sidebar.tsx
---

# DefaultSidebar

`DefaultSidebar` is the built-in sidebar used by [`SidebarLayout`](./sidebar-layout.md). It has two modes:

- **Auto-generation mode** — omit `children` and it renders navigation from your AppShell modules and resources.
- **Composition mode** — pass `children` and build the menu yourself with `SidebarItem`, `SidebarGroup`, `SidebarSeparator`, and the low-level `SidebarMenuItem` / `SidebarMenuButton` primitives.

> Also available as **`SidebarLayout.DefaultSidebar`**. The namespaced form is preferred for discoverability; the top-level `DefaultSidebar` export is kept for backwards compatibility.

## Props

| Prop         | Type              | Default  | Description                                                                                             |
| ------------ | ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `header`     | `React.ReactNode` | built-in | Replaces the sidebar header content.                                                                    |
| `footer`     | `React.ReactNode` | -        | Footer content rendered after the navigation area.                                                      |
| `children`   | `React.ReactNode` | -        | When provided, enables composition mode and disables auto-generation.                                   |
| `hideHeader` | `boolean`         | `false`  | Hides the sidebar's own header row. Useful when a full-width top bar already owns the app title/toggle. |
| `hideSearch` | `boolean`         | `false`  | Hides the built-in **Search** entry that opens the Command Palette.                                     |
| `iconRail`   | `boolean`         | `false`  | Collapses to a persistent icon rail instead of sliding fully off-canvas.                                |

## Basic usage

```tsx
import { SidebarLayout } from "@tailor-platform/app-shell";

function Layout() {
  return <SidebarLayout.DefaultSidebar />;
}
```

## Composition mode

```tsx
import {
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  SidebarSeparator,
} from "@tailor-platform/app-shell";

function Layout() {
  return (
    <SidebarLayout.DefaultSidebar>
      <SidebarItem to="/" />
      <SidebarSeparator />
      <SidebarGroup title="Main">
        <SidebarItem to="/dashboard" />
        <SidebarItem to="/orders" />
      </SidebarGroup>
    </SidebarLayout.DefaultSidebar>
  );
}
```

## Search entry

The built-in **Search** entry opens AppShell's [`CommandPalette`](./command-palette.md). It is rendered in both auto-generated and composed navigation.

Hide it only when search is already exposed elsewhere, such as a dedicated top-bar control:

```tsx
<SidebarLayout.DefaultSidebar hideSearch />
```

## Icon-rail behavior

With `iconRail`, collapsing the sidebar keeps icons visible at every width:

- on desktop, the sidebar collapses to a narrow persistent rail
- on mobile, the rail stays visible and its toggle opens the full sidebar as a slide-in drawer
- grouped items reveal child pages from the collapsed icon via a flyout popover
- items without children show their label in a tooltip

[`GlobalHeaderLayout`](./global-header-layout.md) bakes this mode in through `GlobalHeaderLayout.DefaultSidebar`.

## Working with a global top bar

When the app title and primary toggle live in a full-width top bar, hide the sidebar's own header:

```tsx
<SidebarLayout topBar={<MyGlobalTopBar />} sidebar={<SidebarLayout.DefaultSidebar hideHeader />} />
```

## Custom footer

```tsx
function UserProfile() {
  return (
    <div className="border-t p-4">
      <p className="text-sm font-medium">Ada Lovelace</p>
      <button type="button" className="mt-2 text-sm text-muted-foreground">
        Logout
      </button>
    </div>
  );
}

<SidebarLayout.DefaultSidebar footer={<UserProfile />} />;
```

## Low-level custom items

When `SidebarItem` is too opinionated, compose a custom row with the exported primitives:

```tsx
import { SidebarLayout, SidebarMenuButton, SidebarMenuItem } from "@tailor-platform/app-shell";
import { BellIcon } from "lucide-react";

<SidebarLayout.DefaultSidebar>
  <SidebarMenuItem>
    <SidebarMenuButton
      render={<button type="button" />}
      onClick={() => openNotifications()}
      tooltip="Notifications"
    >
      <BellIcon className="size-4" />
      <span>Notifications</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
</SidebarLayout.DefaultSidebar>;
```

## Related

- [SidebarLayout](./sidebar-layout.md) - layout wrapper for sidebar + content
- [GlobalHeaderLayout](./global-header-layout.md) - opinionated app-wide header mode
- [SidebarItem](./sidebar-item.md) - individual navigation links
- [SidebarGroup](./sidebar-group.md) - collapsible navigation groups
- [Sidebar Navigation](../concepts/sidebar-navigation.md) - navigation concepts and composition patterns
