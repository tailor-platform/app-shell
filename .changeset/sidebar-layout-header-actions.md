---
"@tailor-platform/app-shell": minor
---

Add `headerActions` prop to `SidebarLayout`

`SidebarLayout` now accepts an optional `headerActions` prop for rendering custom action components (notification bell, user menu, global search, etc.) on the right side of the top bar, immediately before the appearance switcher.

```tsx
<SidebarLayout headerActions={<NotificationBell />} />

<SidebarLayout
  headerActions={[<NotificationBell key="bell" />, <UserMenu key="user" />]}
/>
```

The prop accepts a single node or an array of nodes, which are laid out in a horizontal, vertically-centered row with consistent spacing. This provides an official extension point for the top bar, replacing fragile workarounds that queried the header DOM and injected a React portal.
