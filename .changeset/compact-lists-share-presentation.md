---
"@tailor-platform/app-shell": minor
---

Add `ItemList` for compact icon-and-label navigation and actions with collapsible groups, flat sections, and separators. Items require `onClick` or `render`; groups accept rich `ReactNode` titles, heading-only `onClick`, and an explicit `expandOnClick` setting (default `true`).

Use AppShell's `Link` or `NavLink` through `render` for page navigation. ItemList also emphasizes `aria-current="page"`, so `NavLink` can supply both current-page semantics and the active appearance without a separate `isActive` prop. Sidebar behavior remains unchanged.

```tsx
import { ItemList } from "@tailor-platform/app-shell";

<ItemList.Root>
  <ItemList.Group
    title="Getting started"
    render={<a href="#getting-started" />}
    expandOnClick={false}
  >
    <ItemList.Item render={<a href="#installation" aria-label="Installation" />}>
      Installation
    </ItemList.Item>
  </ItemList.Group>
</ItemList.Root>;
```
