---
group: sidebar-layout
title: SidebarLayout
description: Default AppShell layout with a built-in sidebar, content header, optional app-wide top bar, and an escape-hatch body slot
sources:
  - packages/core/src/components/sidebar/sidebar-layout.tsx
---

# SidebarLayout

`SidebarLayout` is the default AppShell layout. By default it renders:

- `SidebarLayout.DefaultSidebar`
- `SidebarLayout.DefaultHeader`
- the current route outlet

You can replace the sidebar, replace the content header, add a full-width `topBar` above the whole shell, or take over the entire region beside the sidebar with the `body` slot.

If you want the opinionated "global app header + icon rail" mode, use [`GlobalHeaderLayout`](./global-header-layout.md), which is built on top of `SidebarLayout`.

## Import

```tsx
import { SidebarLayout } from "@tailor-platform/app-shell";
```

## Basic usage

```tsx
import { AppShell, SidebarLayout } from "@tailor-platform/app-shell";

function App() {
  return (
    <AppShell modules={modules}>
      <SidebarLayout />
    </AppShell>
  );
}
```

This gives you:

- ✅ Responsive sidebar with auto-generated navigation from modules
- ✅ Breadcrumb navigation
- ✅ Theme toggle via the built-in header
- ✅ Mobile-friendly collapse behavior

## Props

### Common props

| Prop          | Type              | Default                            | Description                                                                                                  |
| ------------- | ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `sidebar`     | `React.ReactNode` | `<SidebarLayout.DefaultSidebar />` | Replaces the entire sidebar region.                                                                          |
| `defaultOpen` | `boolean`         | `true`                             | Whether the sidebar starts expanded on desktop.                                                              |
| `collapsible` | `boolean`         | `true`                             | Whether the sidebar can be collapsed. When `false`, toggle controls are hidden and `defaultOpen` is ignored. |
| `topBar`      | `React.ReactNode` | -                                  | Full-width bar above both the sidebar and the content region.                                                |

### Default content mode

Use this when AppShell should keep owning the content column.

| Prop       | Type                                                            | Default                           | Description                                                 |
| ---------- | --------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| `header`   | `React.ReactNode`                                               | `<SidebarLayout.DefaultHeader />` | Replaces the content header above the main column.          |
| `children` | `(props: { Outlet: () => React.ReactNode }) => React.ReactNode` | current route outlet              | Custom content renderer that wraps or surrounds the outlet. |

### Body-slot mode

Use this when you need to compose your own columns beside the sidebar.

| Prop   | Type              | Default  | Description                                                                                                   |
| ------ | ----------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `body` | `React.ReactNode` | required | Replaces everything to the right of the sidebar. Compose it with `ContentContainer`, `Outlet`, and `Trigger`. |

`body` is mutually exclusive with `header` and `children`, because it replaces the region those props normally describe.

## Extending the built-in header

The supported "small customization" path is to pass `SidebarLayout.DefaultHeader` into the `header` slot and fill its `actions` cluster.

```tsx
import { AppearanceSwitcher, Button, SidebarLayout } from "@tailor-platform/app-shell";
import { BellIcon } from "lucide-react";

<SidebarLayout
  header={
    <SidebarLayout.DefaultHeader
      actions={[
        <Button key="notifications" variant="outline" size="icon" aria-label="Notifications">
          <BellIcon className="size-4" />
        </Button>,
        <AppearanceSwitcher key="appearance" />,
      ]}
    />
  }
/>;
```

`actions` replaces the entire right-hand cluster. If you still want the built-in appearance switcher, include `<AppearanceSwitcher />` yourself.

## Replacing the sidebar

Pass `sidebar` to replace the whole left-side region. The built-in component is [`SidebarLayout.DefaultSidebar`](./default-sidebar.md), also exported as `DefaultSidebar`.

```tsx
import {
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  SidebarSeparator,
} from "@tailor-platform/app-shell";

<SidebarLayout
  sidebar={
    <SidebarLayout.DefaultSidebar>
      <SidebarItem to="/" />
      <SidebarSeparator />
      <SidebarGroup title="Main">
        <SidebarItem to="/dashboard" />
        <SidebarItem to="/orders" />
      </SidebarGroup>
    </SidebarLayout.DefaultSidebar>
  }
/>;
```

## Adding an app-wide top bar

`topBar` renders above the whole shell, spanning both the sidebar and the content region.

```tsx
<SidebarLayout topBar={<MyGlobalTopBar />} sidebar={<SidebarLayout.DefaultSidebar hideHeader />} />
```

When `topBar` is present, the fixed sidebar is offset below it. The bar should be `3.5rem` tall (`h-14`) to match the built-in layout.

If you specifically want AppShell's opinionated global-header mode, use [`GlobalHeaderLayout`](./global-header-layout.md), which wires the top bar, icon rail, and matching default sidebar for you.

## Owning the region beside the sidebar

Use `body` when the stock content column is too restrictive and you need your own side columns.

```tsx
<SidebarLayout
  body={
    <>
      <aside className="w-64 shrink-0 overflow-y-auto border-r">
        <TableOfContents />
      </aside>
      <SidebarLayout.ContentContainer header={<SidebarLayout.DefaultHeader />}>
        <SidebarLayout.Outlet />
      </SidebarLayout.ContentContainer>
      <aside className="w-96 shrink-0 overflow-y-auto border-l">
        <AssistantPanel />
      </aside>
    </>
  }
/>
```

`SidebarLayout.ContentContainer` is the stock main column: inset padding, pinned header slot, scroll region, and `useAppShellScrollContainer()` support. `SidebarLayout.Trigger` exposes the built-in sidebar toggle so custom headers do not need DOM workarounds.

## Reading and controlling the sidebar

Use `useAppShellSidebar()` to read and control the sidebar state instead of observing internal DOM attributes or clicking the trigger through the DOM.

```tsx
import { useAppShellSidebar } from "@tailor-platform/app-shell";

function CustomHeader() {
  const { open, isMobile, toggle } = useAppShellSidebar();

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <button type="button" onClick={toggle}>
        {open ? "Hide navigation" : "Show navigation"}
      </button>
      <span>{isMobile ? "Mobile" : "Desktop"}</span>
    </div>
  );
}
```

Outside `SidebarLayout`, the hook returns a safe fallback (`open: true`, `isMobile: false`, no-op setters) rather than throwing.

## Reusing the built-in breadcrumb

`DynamicBreadcrumb` is exported when you want the same route-driven breadcrumb in a custom header or top bar:

```tsx
import { DynamicBreadcrumb, SidebarLayout } from "@tailor-platform/app-shell";

<header className="flex items-center gap-3 border-b px-4 py-3">
  <SidebarLayout.Trigger />
  <DynamicBreadcrumb />
</header>;
```

## Accessing the content scroll container

The AppShell is viewport-bounded (`h-svh`), so the **document itself does not scroll** — the content area does. Code that previously relied on `window`/document scroll (reading `window.scrollY`, listening to `window`'s `scroll` event, `window.scrollTo(...)`, or an `IntersectionObserver` with the default viewport root) should target the content scroll container instead.

Use the `useAppShellScrollContainer()` hook to get a ref to that element from any page:

```tsx
import { useAppShellScrollContainer } from "@tailor-platform/app-shell";
import { useEffect, useState } from "react";

function ReadingProgress() {
  const scrollRef = useAppShellScrollContainer();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? el.scrollTop / max : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  return <progress value={progress} />;
}
```

The same element handles imperative scrolling (`scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })`) and works as an `IntersectionObserver` root (`new IntersectionObserver(cb, { root: scrollRef.current })`).

Notes:

- The element mounts with the layout, above your page, so read `ref.current` inside an effect — it is populated by the time effects run, not during render.
- On a [`<Layout fill>`](./layout.md#fill-mode) page this element does **not** scroll; its children (for example a `DataTable`) manage their own scrolling.
- Outside a `SidebarLayout` (a fully custom layout) the returned ref's `current` is always `null` — such layouts own their own scroll region.
- For non-React access (CSS, tests, plain DOM) the container also carries a `data-appshell-scroll-container` attribute: `document.querySelector("[data-appshell-scroll-container]")`.

## Styling

The sidebar and layout are styled with the library's internal `astw:`-prefixed utilities. Write **plain** Tailwind utilities in your own markup — see [Styling AppShell components](../concepts/styling-theming.md#styling-appshell-components).

## Accessibility

SidebarLayout includes built-in accessibility features:

- **Keyboard navigation** for sidebar interaction
- **ARIA labels** on built-in controls
- **Focus management** when the sidebar opens on mobile
- **Responsive behavior** that works with keyboard, mouse, and touch input

## Related

- [AppShell](./app-shell.md) - root component
- [DefaultHeader](./default-header.md) - built-in content header (`SidebarLayout.DefaultHeader`)
- [DefaultSidebar](./default-sidebar.md) - built-in sidebar (`SidebarLayout.DefaultSidebar`)
- [GlobalHeaderLayout](./global-header-layout.md) - opinionated app-wide header mode built on SidebarLayout
- [AppearanceSwitcher](./appearance-switcher.md) - color-theme dropdown for header actions
- [usePageMeta](../api/use-page-meta.md) - route metadata lookup used by sidebar items
