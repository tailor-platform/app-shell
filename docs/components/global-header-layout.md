---
title: GlobalHeaderLayout
description: Opinionated layout with an app-wide header above the whole shell and a sidebar that collapses to a persistent icon rail
---

# GlobalHeaderLayout

`GlobalHeaderLayout` is AppShell's opinionated "global top bar" layout. It is a thin wrapper over [`SidebarLayout`](./sidebar-layout.md) that wires together:

- an app-wide header above both the sidebar and the content area
- a default sidebar with its own header removed
- icon-rail collapse behavior
- the stock content container and outlet

Use it when you want the whole app to share one top bar. Reach for `SidebarLayout` directly when you need the more flexible primitive.

## Import

```tsx
import { GlobalHeaderLayout } from "@tailor-platform/app-shell";
```

## Basic usage

```tsx
import {
  AppShell,
  AppearanceSwitcher,
  GlobalHeaderLayout,
  SidebarGroup,
  SidebarItem,
} from "@tailor-platform/app-shell";
import { LayersIcon } from "lucide-react";

function App() {
  return (
    <AppShell title="Operations" modules={modules}>
      <GlobalHeaderLayout
        header={
          <GlobalHeaderLayout.DefaultHeader
            actions={[<AppearanceSwitcher key="appearance" />]}
          />
        }
        sidebar={
          <GlobalHeaderLayout.DefaultSidebar>
            <SidebarItem to="/" />
            <SidebarGroup title="Main" icon={<LayersIcon className="size-4" />}>
              <SidebarItem to="/dashboard" />
              <SidebarItem to="/orders" />
            </SidebarGroup>
          </GlobalHeaderLayout.DefaultSidebar>
        }
      />
    </AppShell>
  );
}
```

## Props

| Prop          | Type                                                             | Default                                  | Description                                                      |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| `header`      | `React.ReactNode`                                                | `<GlobalHeaderLayout.DefaultHeader />`   | Replaces the full-width app header.                              |
| `sidebar`     | `React.ReactNode`                                                | `<GlobalHeaderLayout.DefaultSidebar />`  | Replaces the primary sidebar.                                    |
| `defaultOpen` | `boolean`                                                        | `true`                                   | Whether the sidebar starts expanded on desktop.                  |
| `collapsible` | `boolean`                                                        | `true`                                   | Whether the sidebar can be collapsed.                            |
| `children`    | `(props: { Outlet: () => React.ReactNode }) => React.ReactNode` | current route outlet                     | Custom content renderer for the stock content container.         |
| `body`        | `React.ReactNode`                                                | -                                        | Escape hatch that replaces the entire region beside the sidebar. |

`children` and `body` are mutually exclusive. Use `body` when you need to add your own side columns around the main content.

## Built-in parts

`GlobalHeaderLayout` exposes the same composition pieces as `SidebarLayout`, plus the opinionated header and sidebar defaults:

| Export                              | Description                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `GlobalHeaderLayout.DefaultHeader`  | The app-wide header (`GlobalHeader`) with app title + breadcrumb on the left and `actions` on the right. |
| `GlobalHeaderLayout.DefaultSidebar` | `DefaultSidebar` with `hideHeader` and `iconRail` forced on.                          |
| `GlobalHeaderLayout.ContentContainer` | The stock main content column.                                                      |
| `GlobalHeaderLayout.Outlet`         | The current route outlet.                                                             |
| `GlobalHeaderLayout.Trigger`        | The built-in sidebar toggle button.                                                   |
| `GlobalHeaderLayout.Breadcrumb`     | The route-driven breadcrumb component (`DynamicBreadcrumb`).                          |

## `GlobalHeader`

The layout's default header is also exported as a top-level `GlobalHeader` component. It renders:

- the AppShell `title` and optional `icon`
- the route-driven breadcrumb
- a right-aligned `actions` cluster

`actions` behaves the same way as on `SidebarLayout.DefaultHeader`: omitting it renders the built-in [`AppearanceSwitcher`](./appearance-switcher.md), and passing it replaces the entire right-hand cluster.

```tsx
import { AppearanceSwitcher, GlobalHeader } from "@tailor-platform/app-shell";

<GlobalHeader actions={[<AppearanceSwitcher key="appearance" />]} />;
```

## Owning the body region

Use `body` when you want custom columns beside the content while still keeping the global header and icon-rail sidebar.

```tsx
<GlobalHeaderLayout
  body={
    <>
      <GlobalHeaderLayout.ContentContainer>
        <GlobalHeaderLayout.Outlet />
      </GlobalHeaderLayout.ContentContainer>
      <aside className="w-96 shrink-0 overflow-y-auto border-l">
        <AssistantPanel />
      </aside>
    </>
  }
/>
```

## When to use which layout

| Goal | Use |
| ---- | --- |
| Built-in sidebar + content header | [`SidebarLayout`](./sidebar-layout.md) |
| Full-width app header above the whole shell | `GlobalHeaderLayout` |
| Completely custom page structure with AppShell routing | `SidebarLayout body={...}` or `GlobalHeaderLayout body={...}` |

## Related

- [SidebarLayout](./sidebar-layout.md) - lower-level primitive that GlobalHeaderLayout wraps
- [DefaultSidebar](./default-sidebar.md) - underlying sidebar component used by `GlobalHeaderLayout.DefaultSidebar`
- [DefaultHeader](./default-header.md) - content-column header for `SidebarLayout`
