---
title: DefaultHeader
description: The built-in SidebarLayout top bar, extensible via an actions slot
---

# DefaultHeader

`DefaultHeader` is the built-in top bar rendered by [`SidebarLayout`](./sidebar-layout.md). It shows the sidebar trigger and breadcrumb trail on the left, and an `actions` cluster (defaulting to the [`AppearanceSwitcher`](./appearance-switcher.md)) on the right.

It is exposed as `SidebarLayout.DefaultHeader` (and as a top-level `DefaultHeader` export) so you can slightly extend the built-in header — the common case being adding a notification bell or user menu — without reconstructing the trigger and breadcrumb yourself.

## Import

```tsx
import { SidebarLayout } from "@tailor-platform/app-shell";
// SidebarLayout.DefaultHeader

// or, equivalently:
import { DefaultHeader } from "@tailor-platform/app-shell";
```

## Usage

`DefaultHeader` goes into `SidebarLayout`'s [`header`](./sidebar-layout.md#header) slot:

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
        <AppearanceSwitcher key="appearance" />,
      ]}
    />
  }
/>;
```

## Props

### actions

- **Type:** `React.ReactNode | React.ReactNode[]` (optional)
- **Default:** `[<AppearanceSwitcher />]`
- **Description:** The entire right-hand cluster of the header. Rendered in a horizontal, vertically-centered row (`flex flex-row items-center gap-2`) with consistent spacing — you don't wrap it yourself. Accepts a single node or an array of nodes.

> ⚠️ **`actions` replaces the whole right-hand cluster, including the appearance switcher.**
>
> - Omitting `actions` keeps the default (`[<AppearanceSwitcher />]`), so the out-of-the-box header is unchanged.
> - If you pass your own `actions` and still want the switcher, include `<AppearanceSwitcher />` in the array — it is a public export.
> - `actions={[]}` renders an empty right side.

This "the switcher is just another action" contract keeps the API a single slot rather than accumulating one-off props like `hideAppearanceSwitcher`.

## When to use which level of customization

| Goal                              | Approach                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------- |
| The standard header               | Omit `header` on `SidebarLayout`                                                |
| Add controls next to the switcher | `header={<SidebarLayout.DefaultHeader actions={[...]} />}`                      |
| A completely different header     | `header={<MyCustomHeader />}` (see [SidebarLayout](./sidebar-layout.md#header)) |

## Related Components

- [SidebarLayout](./sidebar-layout.md) - Hosts the header via the `header` slot
- [DefaultSidebar](./default-sidebar.md) - The sibling built-in region (`SidebarLayout.DefaultSidebar`)
- [AppearanceSwitcher](./appearance-switcher.md) - Default action; include it in `actions` to keep it
- [Button](./button.md) - For building icon actions
