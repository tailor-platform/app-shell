---
"@tailor-platform/app-shell": minor
---

Add `defaultOpen` and `collapsible` props to `SidebarLayout` for controlling sidebar behavior.

```tsx
// Sidebar closed by default on desktop
<SidebarLayout defaultOpen={false} />

// Non-collapsible sidebar (always visible, toggle buttons hidden)
<SidebarLayout collapsible={false} />
```
