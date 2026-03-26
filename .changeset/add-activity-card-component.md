---
"@tailor-platform/app-shell": minor
---

Add `ActivityCard` component: a scrollable timeline of document activities with avatars, optional day grouping (`none` | `day`), and overflow into a full-list dialog.

```tsx
import { ActivityCard } from "@tailor-platform/app-shell";
import type { ActivityCardActivity } from "@tailor-platform/app-shell";

const activities: ActivityCardActivity[] = [
  {
    id: "1",
    userDisplayName: "Alice",
    description: "Created the document",
    timestamp: new Date(),
  },
];

<ActivityCard
  title="Updates"
  activities={activities}
  maxVisible={6}
  groupBy="day"
/>;
```
