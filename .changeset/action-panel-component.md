---
"@tailor-platform/app-shell": minor
---

Add ActionPanel component for ERP-style action lists.

**ActionPanel** — Card with a title and vertical list of actions (icon + label). Each row is a button triggered via `onClick`. The panel uses full width of its parent by default.

### Example

```tsx
import { ActionPanel } from "@tailor-platform/app-shell";

<ActionPanel
  title="Actions"
  actions={[
    {
      key: "create",
      label: "Create new invoice",
      icon: <ReceiptIcon />,
      onClick: () => openCreateModal(),
    },
    {
      key: "docs",
      label: "View documentation",
      icon: <DocIcon />,
      onClick: () => window.open("/docs", "_blank", "noopener,noreferrer"),
    },
  ]}
/>
```
