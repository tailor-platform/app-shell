---
"@tailor-platform/app-shell": minor
---

Add `searchSources` prop to `AppShell` to wire async, prefix-based search into the CommandPalette. Each source declares a short `prefix` (e.g. `"ORD"`) and an async `search` function. When the user types that prefix followed by `:`, the palette switches into search mode: Actions and Pages sections are hidden and only results from that source are shown.

The empty-input state of the palette now includes a **Search Modes** section that lists every registered source, so users can discover and activate a mode with a single click instead of remembering the prefix syntax.

`DefaultSidebar` always renders a **Search** entry that opens the palette (Cmd+K also works globally), because routes and registered actions are always searchable regardless of whether any `searchSources` are configured.

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

<AppShell searchSources={searchSources}>
  <SidebarLayout sidebar={<DefaultSidebar />} />
</AppShell>;
```
