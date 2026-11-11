---
"@tailor-platform/app-shell": minor
---

Add `sidebarBehaviour` to `<SidebarLayout />` and `<GlobalHeaderLayout />` with `"fixed"`, `"collapse"`, `"resize"`, and `"collapse-and-resize"` desktop modes; the default enables both operations. `useAppShellSidebar()` exposes the effective, normalized mode alongside its existing state and actions.

Reuse the desktop edge handle for continuous drag-to-expand/resize/collapse, keyboard controls, and double-click reset to 256px. Resize-only mode clamps to 192–480px without resistance or collapsing; double-click never collapses it. Live CSS widths and ARIA updates avoid per-move React renders, with committed width updates at mode changes and gesture completion.

Deprecate the boolean `collapsible` prop: explicit `false` maps to `"fixed"`, explicit `true` maps to `"collapse"`, and specifying both old and new props is a type error. All modes use normal responsive mobile/tablet drawers and overlays. This intentionally changes legacy `collapsible={false}`, which no longer forces a fixed sidebar on mobile/tablet.

```tsx
// Before
<SidebarLayout collapsible={false} />;

// After: fixed desktop, normal responsive drawer/overlay
<SidebarLayout sidebarBehaviour="fixed" />;

// Resize without collapsing
<GlobalHeaderLayout sidebarBehaviour="resize" />;
```
