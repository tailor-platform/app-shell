---
"@tailor-platform/app-shell": minor
---

Add `searchSources` prop to `AppShell` for async prefix-based search in the CommandPalette. `DefaultSidebar` now always shows a search entry that opens the palette.

```tsx
import { AppShell, type SearchSource } from "@tailor-platform/app-shell";

const searchSources: readonly SearchSource[] = [
  {
    prefix: "ORD",
    title: "Orders",
    search: async (query, { signal }) => {
      const results = await api.searchOrders(query, { signal });
      return results.map((o) => ({
        key: o.id,
        label: o.number,
        path: `/orders/${o.id}`,
      }));
    },
  },
];

<AppShell modules={modules} searchSources={searchSources}>
  <SidebarLayout sidebar={<DefaultSidebar />} />
</AppShell>;
```
