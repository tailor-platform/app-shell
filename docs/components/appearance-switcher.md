---
title: AppearanceSwitcher
description: Pre-built dropdown for toggling the application color theme
---

# AppearanceSwitcher

`AppearanceSwitcher` is a ready-made button and dropdown menu that lets end users switch between **Light**, **Dark**, and **System** color modes. It reads and writes the theme through [`useTheme`](../api/use-theme.md) and requires no configuration.

## Import

```tsx
import { AppearanceSwitcher } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<AppearanceSwitcher />
```

Drop it anywhere inside an `<AppShell>` tree — for example in a sidebar footer or a settings toolbar.

It is also the default action in [`SidebarLayout.DefaultHeader`](./default-header.md). Because `DefaultHeader`'s `actions` prop **replaces** the entire right-hand cluster, you must include `<AppearanceSwitcher />` in your `actions` array if you customize the header and still want the switcher:

```tsx
<SidebarLayout
  header={
    <SidebarLayout.DefaultHeader
      actions={[<NotificationBell key="bell" />, <AppearanceSwitcher key="appearance" />]}
    />
  }
/>
```

## Props

`AppearanceSwitcher` accepts no props. Color theme state is managed internally via `useTheme`.

## Behavior

- Renders a palette icon button. Clicking it opens a popover menu with three radio options: **Light**, **Dark**, and **System**.
- The active option is highlighted.
- When **System** is selected, the button tooltip shows the currently resolved mode (e.g. _"Following system — currently dark"_).
- The selected preference is persisted to `localStorage` (key `appshell-ui-theme`) and restored on subsequent visits.

## Example: Sidebar Footer

```tsx
import {
  AppShell,
  SidebarLayout,
  DefaultSidebar,
  AppearanceSwitcher,
} from "@tailor-platform/app-shell";

function CustomSidebar() {
  return (
    <DefaultSidebar
      footer={
        <div className="flex items-center justify-end p-2">
          <AppearanceSwitcher />
        </div>
      }
    />
  );
}

function App() {
  return (
    <AppShell title="My App" modules={modules}>
      <SidebarLayout sidebar={<CustomSidebar />} />
    </AppShell>
  );
}
```

## Related

- [useTheme](../api/use-theme.md) — hook to read and set the color theme programmatically
- [Styling & Theming](../concepts/styling-theming.md) — color themes and palette overview
