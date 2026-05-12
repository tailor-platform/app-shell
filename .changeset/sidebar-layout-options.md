---
"@tailor-platform/app-shell": minor
---

Add a `defaultOpen` prop to `SidebarLayout`.

- `SidebarLayout` now accepts a `defaultOpen` prop to control the initial expanded/collapsed state of the sidebar.

```tsx
import { SidebarLayout } from "@tailor-platform/app-shell";

// Sidebar collapsed by default
<SidebarLayout defaultOpen={false} />;
```
