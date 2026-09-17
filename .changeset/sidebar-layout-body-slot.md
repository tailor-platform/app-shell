---
"@tailor-platform/app-shell": minor
---

Add a `body` slot to `SidebarLayout` for laying out your own columns beside the sidebar — a table-of-contents rail, an assistant panel docked flush against the viewport edge — without overriding AppShell internals. Whatever you pass becomes a flex row alongside the sidebar, so it widens and narrows with the sidebar automatically.

Compose it from the namespaced building blocks rather than rebuilding them. `SidebarLayout.ContentContainer` is the stock content column (inset padding, pinned header slot, scroll region, and `useAppShellScrollContainer()`), so the main column keeps its normal chrome while you add columns around it.

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

`body` replaces the region that `header` and `children` describe, so the three are mutually exclusive: passing `body` alongside either is a type error, and you place the header yourself via `ContentContainer`. Existing `header` / `children` / `sidebar` usage is unaffected.

Also adds `useAppShellSidebar()` for reading and controlling the sidebar's collapsed state, replacing workarounds that observed `[data-slot="sidebar"][data-state]` with a `MutationObserver` or clicked the trigger through the DOM. `SidebarLayout.Trigger` exposes that toggle for custom headers.

```tsx
const { open, isMobile, setOpen, toggle } = useAppShellSidebar();
```
