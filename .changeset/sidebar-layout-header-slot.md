---
"@tailor-platform/app-shell": minor
---

Add a `header` slot to `SidebarLayout` and a `SidebarLayout.DefaultHeader` building block

`SidebarLayout` now accepts a full-region `header?: ReactNode` prop, mirroring the existing `sidebar` slot. It defaults to the built-in header (`SidebarLayout.DefaultHeader`), so existing usage is unchanged.

To extend the built-in header (e.g. add a notification bell or user menu) without reconstructing the trigger and breadcrumb, use `SidebarLayout.DefaultHeader` with its `actions` slot:

```tsx
<SidebarLayout
  header={
    <SidebarLayout.DefaultHeader
      actions={[<NotificationBell key="bell" />, <AppearanceSwitcher key="appearance" />]}
    />
  }
/>
```

- `DefaultHeader`'s `actions` prop (single node or array) controls the entire right-hand cluster, laid out in a horizontal, vertically-centered row.
- `actions` **defaults to `[<AppearanceSwitcher />]`**, and **passing `actions` replaces the whole cluster including the switcher** — include `<AppearanceSwitcher />` explicitly to keep it. This keeps the API a single slot instead of accumulating one-off props.
- `DefaultHeader` is available as `SidebarLayout.DefaultHeader` and as a top-level `DefaultHeader` export.
- `DefaultSidebar` is now also exposed as `SidebarLayout.DefaultSidebar` for symmetry; the top-level `DefaultSidebar` export is retained for backwards compatibility.

This provides an official, composable extension point for the top bar, replacing fragile consumer workarounds that queried the header DOM and injected a React portal.
