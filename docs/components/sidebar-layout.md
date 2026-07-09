---
title: SidebarLayout
description: The default layout component with sidebar navigation, breadcrumbs, and theme toggle
---

# SidebarLayout

`SidebarLayout` is the default layout component that provides a responsive sidebar navigation, breadcrumb trail, and theme toggle. It's designed to work seamlessly with AppShell's module system.

## Import

```tsx
import { SidebarLayout } from "@tailor-platform/app-shell";
```

## Basic Usage

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
- **Default:** `<SidebarLayout.DefaultSidebar />`
- **Description:** Replaces the whole sidebar region. Omit it for the built-in sidebar.

```tsx
import { SidebarLayout, SidebarItem } from "@tailor-platform/app-shell";

<SidebarLayout
  sidebar={
    <SidebarLayout.DefaultSidebar>
      <SidebarItem label="Custom Link" href="/custom" />
    </SidebarLayout.DefaultSidebar>
  }
/>;
```

> `SidebarLayout.DefaultSidebar` is the same component as the top-level
> `DefaultSidebar` export (kept for backwards compatibility). The namespaced form
> is preferred for discoverability — it pairs with
> [`SidebarLayout.DefaultHeader`](#header).

### defaultOpen

- **Type:** `boolean` (optional)
- **Default:** `true`
- **Description:** Whether the sidebar is open by default on desktop. Has no effect when `collapsible` is `false`.

```tsx
// Sidebar closed by default on desktop
<SidebarLayout defaultOpen={false} />
```

### collapsible

- **Type:** `boolean` (optional)
- **Default:** `true`
- **Description:** Whether the sidebar can be collapsed. When set to `false`, the sidebar is always visible and toggle buttons are hidden. `defaultOpen` is ignored when this is `false`.

```tsx
// Non-collapsible sidebar (always visible, toggle buttons hidden)
<SidebarLayout collapsible={false} />
```

### header

- **Type:** `React.ReactNode` (optional)
- **Default:** `<SidebarLayout.DefaultHeader />`
- **Description:** Replaces the whole top-bar region. Omit it for the built-in header.

Like `sidebar`, `header` is a full-region slot. There are three levels of customization:

**1. Default** — omit `header` entirely:

```tsx
<SidebarLayout />
```

**2. Extend the built-in header** — pass `SidebarLayout.DefaultHeader` and use its
`actions` slot. This is the common case (e.g. adding a notification bell) and
keeps the trigger + breadcrumb without reconstructing them:

```tsx
import { SidebarLayout, AppearanceSwitcher, Button } from "@tailor-platform/app-shell";
import { BellIcon } from "lucide-react";

<SidebarLayout
  header={
    <SidebarLayout.DefaultHeader
      actions={[
        <Button key="bell" variant="outline" size="icon" aria-label="Notifications">
          <BellIcon />
        </Button>,
        // `actions` REPLACES the default right-hand cluster, so include the
        // appearance switcher explicitly to keep it.
        <AppearanceSwitcher key="appearance" />,
      ]}
    />
  }
/>;
```

**3. Replace it entirely** — supply your own node:

```tsx
<SidebarLayout header={<MyCustomHeader />} />
```

#### `SidebarLayout.DefaultHeader`

The built-in header: sidebar trigger + breadcrumb on the left, and the `actions`
cluster on the right.

- **`actions`** — `React.ReactNode | React.ReactNode[]` (optional). The entire
  right-hand cluster, laid out in a horizontal, vertically-centered row with
  consistent spacing.
  - **Default:** `[<AppearanceSwitcher />]` — so out-of-the-box behavior is
    unchanged.
  - ⚠️ **`actions` replaces the whole right-hand cluster, including the
    appearance switcher.** If you pass your own actions and still want the
    switcher, include `<AppearanceSwitcher />` in the array (it is a public
    export). `actions={[]}` renders an empty right side.

This is the supported extension point for the top bar — it replaces fragile
workarounds that queried the header DOM and injected a React portal.

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

The built-in header renders an [`AppearanceSwitcher`](./appearance-switcher.md) — a palette-icon button whose dropdown switches the color theme (persisted to localStorage). To add your own controls (notifications, user menu, etc.) alongside it, pass [`SidebarLayout.DefaultHeader`](#header) with an `actions` array that includes `<AppearanceSwitcher />`.

## Customization Examples

### Custom Header and Footer

```tsx
import { SidebarLayout } from "@tailor-platform/app-shell";

const CustomHeader = () => (
  <div className="astw:bg-blue-500 astw:text-white astw:p-4">
    <h2>Welcome to My App</h2>
  </div>
);

const CustomFooter = () => (
  <footer className="astw:p-4 astw:text-sm astw:text-gray-600">© 2026 My Company</footer>
);

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
  );
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
} from "@tailor-platform/app-shell";
import { HelpCircle, ExternalLink } from "lucide-react";

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
  );
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
- On a [`<Layout fill>`](./layout.md#fill-mode) page this element does **not** scroll; its children (e.g. a `DataTable`) manage their own scrolling.
- Outside a `SidebarLayout` (a fully custom layout) the returned ref's `current` is always `null` — such layouts own their own scroll region.
- For non-React access (CSS, tests, plain DOM) the container also carries a `data-appshell-scroll-container` attribute: `document.querySelector("[data-appshell-scroll-container]")`.

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
- [DefaultHeader](./default-header.md) - Built-in header (`SidebarLayout.DefaultHeader`)
- [DefaultSidebar](./default-sidebar.md) - Built-in sidebar (`SidebarLayout.DefaultSidebar`)
- [AppearanceSwitcher](./appearance-switcher.md) - Color-theme dropdown, composable into header `actions`
- [SidebarItem](./sidebar-item.md) - Individual sidebar navigation items
- [SidebarGroup](./sidebar-group.md) - Group sidebar items

## Related Concepts

- [Modules and Resources](../concepts/modules-and-resources.md) - How navigation is generated
- [Routing and Navigation](../concepts/routing-navigation.md) - Navigation between pages
- [Styling and Theming](../concepts/styling-theming.md) - Customize appearance

## API Reference

- [useTheme](../api/use-theme.md) - Access theme context
