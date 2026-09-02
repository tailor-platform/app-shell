---
"@tailor-platform/app-shell": minor
---

Add an opt-in global top bar to `SidebarLayout` — a full-width bar that spans above the primary sidebar and the content region alike, so apps can adopt an app-wide header incrementally. Every addition is opt-in; layouts that don't use them are unchanged.

- `SidebarLayout` gains a `topBar` slot, rendered above the sidebar + content row. The fixed sidebar is offset to start just beneath it (via `--appshell-topbar-h`, defaulting to `0px`). The bar is expected to be `3.5rem` tall — matching the default header — or you can set `--appshell-topbar-h` yourself.
- `SidebarLayout.DefaultSidebar` gains `hideHeader`, `hideSearch`, and `iconRail`: defer the sidebar's own title and search to the top bar, and collapse to a persistent icon rail that stays visible at every width — including mobile, where the rail stays put and its toggle opens the full sidebar as a slide-in drawer — instead of sliding off-canvas.
- The low-level `SidebarMenuItem` and `SidebarMenuButton` primitives are now exported, for composing custom sidebar entries (e.g. a notifications action) that collapse to an icon with a tooltip in the icon rail, exactly like the built-ins.

```tsx
<SidebarLayout
  topBar={<GlobalTopBar />}
  sidebar={<SidebarLayout.DefaultSidebar hideHeader hideSearch iconRail />}
/>
```
