---
"@tailor-platform/app-shell": minor
---

Add `ActivityCard` component: a scrollable timeline of document activities with avatars, optional day grouping (`none` | `day`), and overflow into a full-list dialog.

Each activity can carry an optional `actor` (covering users, bots, service accounts, or external systems). Omit `actor` entirely for system events with no specific subject.

```tsx
import { ActivityCard } from "@tailor-platform/app-shell";
import type { ActivityCardActivity } from "@tailor-platform/app-shell";

const activities: ActivityCardActivity[] = [
  {
    id: "1",
    actor: { name: "Alice", avatarUrl: "/avatars/alice.jpg" },
    description: "Created the document",
    timestamp: new Date(),
  },
  {
    id: "2",
    // no actor — system event
    description: "Status automatically changed to EXPIRED",
    timestamp: new Date(),
  },
];

<ActivityCard title="Updates" activities={activities} maxVisible={6} groupBy="day" />;
```
