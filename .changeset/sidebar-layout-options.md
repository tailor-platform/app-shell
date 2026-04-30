---
"@tailor-platform/app-shell": minor
---

Add `ContentOnlyLayout` component and `defaultOpen` prop to `SidebarLayout`.

- `ContentOnlyLayout`: A layout without sidebar for use cases like kiosk screens where only the route content should be rendered.
- `SidebarLayout` now accepts a `defaultOpen` prop to control the initial expanded/collapsed state of the sidebar.

```tsx
import { SidebarLayout, ContentOnlyLayout } from "@tailor-platform/app-shell";

// Sidebar-less layout for kiosk or embedded screens
<ContentOnlyLayout />

// Sidebar collapsed by default
<SidebarLayout defaultOpen={false} />
```
