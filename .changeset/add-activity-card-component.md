---
"@tailor-platform/app-shell": minor
---

Add `ActivityCard` APIs for both simple and advanced use cases:

- Standalone API (`<ActivityCard />`) for quick timeline rendering with sensible defaults
- Compound API (`ActivityCard.Root` / `.Items` / `.Item`) for fully custom item rendering (icons, links, buttons, badges, mixed item kinds)

## Standalone API

```tsx
import { ActivityCard } from "@tailor-platform/app-shell";

<ActivityCard items={items} title="Updates" maxVisible={6} overflowLabel="more" groupBy="day" />;
```

## Compound API

```tsx
import { ActivityCard, Badge } from "@tailor-platform/app-shell";
import type { ActivityCardBaseItem } from "@tailor-platform/app-shell";

interface MyItem extends ActivityCardBaseItem {
  kind: "approval" | "update";
  label?: string;
  message?: string;
}

<ActivityCard.Root items={items} title="Updates" groupBy="day">
  <ActivityCard.Items<MyItem>>
    {(item) =>
      item.kind === "approval" ? (
        <ActivityCard.Item indicator={<ApprovedIcon />}>
          <p>{item.label}</p>
          <Badge variant="default">Complete</Badge>
        </ActivityCard.Item>
      ) : (
        <ActivityCard.Item>
          <p>{item.message}</p>
          <a href="#">View changes</a>
        </ActivityCard.Item>
      )
    }
  </ActivityCard.Items>
</ActivityCard.Root>;
```

Each item must satisfy `ActivityCardBaseItem` (`id` + `timestamp`). Items without an `indicator` render a default timeline node. The `indicator` prop accepts any `ReactNode` (avatars, icons, etc.).
