---
"@tailor-platform/app-shell": minor
---

Add `ItemList` for compact icon-and-label navigation and actions with collapsible groups, flat sections, and separators. Use the same list presentation in page content and the Sidebar without requiring Sidebar providers or routing context.

```tsx
import { ItemList } from "@tailor-platform/app-shell";

<ItemList.Root>
  <ItemList.Group title="Getting started">
    <ItemList.Item render={<a href="#installation" aria-label="Installation" />}>
      Installation
    </ItemList.Item>
  </ItemList.Group>
</ItemList.Root>;
```
