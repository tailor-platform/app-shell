---
"@tailor-platform/app-shell": minor
---

Add `GlobalHeaderLayout` — an opinionated app-shell layout with an app-wide header above the whole shell and a sidebar that collapses to a persistent icon rail. It is a thin wrapper over `SidebarLayout` that wires the whole mode so consumers get the intended experience without reconstructing it from individual props; reach for `SidebarLayout` directly when you need the flexible primitive.

```tsx
<GlobalHeaderLayout
  header={<GlobalHeaderLayout.DefaultHeader actions={[<AppearanceSwitcher key="a" />]} />}
  sidebar={
    <GlobalHeaderLayout.DefaultSidebar>
      <SidebarItem to="/" />
      <SidebarGroup title="Main" icon={<LayersIcon />}>
        <SidebarItem to="/dashboard" />
        <SidebarItem to="/orders" />
      </SidebarGroup>
    </GlobalHeaderLayout.DefaultSidebar>
  }
>
  {({ Outlet }) => <Outlet />}
</GlobalHeaderLayout>
```

- `GlobalHeaderLayout` namespaces `.DefaultHeader` (the new `GlobalHeader` — app title + route breadcrumb + an `actions` cluster), `.DefaultSidebar` (drops its own header and turns on the icon rail, with the collapse toggle at the bottom-left), `.ContentContainer`, `.Outlet`, `.Trigger`, and `.Breadcrumb`.
- The route-driven **`DynamicBreadcrumb`** is now exported (with the `usePathSegments` hook) — no need to hand-roll a breadcrumb.

It's built on these `SidebarLayout` additions, which are also public for the primitive/escape-hatch path (all opt-in and backward compatible):

- `SidebarLayout` gains a `topBar` slot — a full-width bar above the sidebar + content row; the fixed sidebar is offset to start beneath it (via `--appshell-topbar-h`, `0px` when there is no `topBar`). The bar should be `3.5rem` tall.
- `SidebarLayout.DefaultSidebar` gains `hideHeader`, `hideSearch`, and `iconRail`. `iconRail` collapses to a persistent icon rail that stays visible at every width — including mobile, where the rail stays put and its toggle opens the full sidebar as a slide-in drawer — instead of sliding off-canvas.
- In the icon rail, hovering a `SidebarGroup`'s icon reveals its child pages in a flyout popover (portaled so it escapes the rail's clipping, and kept within the viewport); items without children show their name in a tooltip.
- The low-level `SidebarMenuItem` and `SidebarMenuButton` primitives are now exported, for composing custom sidebar entries (e.g. a notifications action) that behave in the icon rail like the built-ins.
