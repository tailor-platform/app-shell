---
title: ActivityCard
description: Timeline of recent document activities with avatars and overflow dialog
---

# ActivityCard

The `ActivityCard` component displays a timeline of recent activities (e.g. changes on a PO, SO, or GR document). Each entry shows an avatar, user name, description, and timestamp. A limited number of activities are shown in the card; additional activities are available via a clickable overflow that opens a dialog with a scrollable full list.

## Import

```tsx
import {
  ActivityCard,
  type ActivityCardItem,
  type ActivityCardBaseItem,
  type ActivityCardProps,
} from "@tailor-platform/app-shell";
```

Use `ActivityCardItem` for each item in the standalone API. Use `ActivityCardBaseItem` as the minimum constraint when extending items for the compound API.

## Basic Usage

```tsx preview
import { ActivityCard } from "@tailor-platform/app-shell";

<ActivityCard 
  title="Updates" 
  items={[
    {
      id: "1",
      actor: { name: "Hanna", avatarUrl: "/avatars/hanna.jpg" }, // avatarUrl is optional
      description: "changed the status from DRAFT to CONFIRMED",
      timestamp: new Date("2025-03-21T09:00:00"),
    },
    {
      id: "2",
      actor: { name: "Pradeep Kumar" },
      description: "created this PO",
      timestamp: new Date("2025-03-21T15:16:00"),
    },
    {
      id: "3",
      // no actor — system event with no specific subject
      description: "Status automatically changed to EXPIRED",
      timestamp: new Date("2025-03-20T10:00:00"),
    },
  ]} 
/>
```

## Overflow and dialog

By default the card shows the 6 most recent activities. If there are more, a button appears at the bottom (e.g. **"2 more activities"**). Clicking it opens a modal dialog titled "All activities" with the full list in a scrollable area. The overflow label can be switched to a count style (**"+2"**) via the `overflowLabel` prop.

```tsx
<ActivityCard items={manyItems} title="Updates" maxVisible={6} overflowLabel="more" />
// or overflowLabel="count" for "+N"
```

## Grouping by day

Set `groupBy="day"` to group activities under labels like "TODAY", "YESTERDAY", or a formatted date.

```tsx
<ActivityCard items={items} title="Updates" groupBy="day" />
```

## Props

| Prop            | Type                 | Default  | Description                                       |
| --------------- | -------------------- | -------- | ------------------------------------------------- |
| `items`         | `ActivityCardItem[]` | required | List of items (newest first).                     |
| `title`         | `string`             | -        | Card title, e.g. "Updates".                       |
| `maxVisible`    | `number`             | `6`      | Max activities shown in the card before overflow. |
| `overflowLabel` | `"more" \| "count"`  | `"more"` | "N more activities" vs "+N".                      |
| `groupBy`       | `"none" \| "day"`    | `"none"` | Optional grouping by day.                         |
| `className`     | `string`             | -        | Applied to the card root.                         |

Each activity must include: `id`, `description`, `timestamp` (Date or string). Optional: `actor` (`{ name, avatarUrl? }`) — omit for system events with no specific actor (initials fallback when `avatarUrl` is absent).

---

## Compound API

Use the compound API when you need fully custom item rendering — custom icons, links, badges, or mixed item kinds. Items still must satisfy `ActivityCardBaseItem` (`id` + `timestamp`). You extend `ActivityCardBaseItem` with any additional fields you need.

### Example

```tsx preview
import { ActivityCard, type ActivityCardBaseItem } from "@tailor-platform/app-shell";

<ActivityCard.Root 
  items={[
    { id: "1", timestamp: new Date(), kind: "approval", label: "PO approved" },
    { id: "2", timestamp: new Date(), kind: "update", message: "Status changed to CONFIRMED" },
  ]} 
  title="Updates" 
  groupBy="day"
>
  <ActivityCard.Items>
    {(item) =>
      item.kind === "approval" ? (
        <ActivityCard.Item>
          <p style={{ color: "green" }}>{item.label}</p>
        </ActivityCard.Item>
      ) : (
        <ActivityCard.Item>
          <p style={{ fontWeight: "bold" }}>{item.message}</p>
        </ActivityCard.Item>
      )
    }
  </ActivityCard.Items>
</ActivityCard.Root>
```

### Parts

| Part                 | Description                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ActivityCard.Root`  | Outer card container. Accepts the same `items`, `title`, `maxVisible`, `overflowLabel`, `groupBy` props as the standalone API, plus `children`. |
| `ActivityCard.Items` | Iterates over items and renders each via a render-prop children function. Generic over your item type.                                          |
| `ActivityCard.Item`  | A single row in the timeline. Accepts an optional `indicator` (any `ReactNode`) for the left column.                                            |

### ActivityCard.Root Props

| Prop            | Type                | Default  | Description                                                           |
| --------------- | ------------------- | -------- | --------------------------------------------------------------------- |
| `items`         | `T[]`               | required | List of items (newest first). `T` must extend `ActivityCardBaseItem`. |
| `title`         | `string`            | -        | Card title, e.g. "Updates".                                           |
| `maxVisible`    | `number`            | `6`      | Max items shown in the card before overflow.                          |
| `overflowLabel` | `"more" \| "count"` | `"more"` | "N more activities" vs "+N".                                          |
| `groupBy`       | `"none" \| "day"`   | `"none"` | Optional grouping by day.                                             |
| `className`     | `string`            | -        | Applied to the card root.                                             |
| `children`      | `React.ReactNode`   | required | Must contain `ActivityCard.Items`.                                    |

### ActivityCard.Item Props

| Prop        | Type              | Default | Description                                                                                |
| ----------- | ----------------- | ------- | ------------------------------------------------------------------------------------------ |
| `indicator` | `React.ReactNode` | -       | Element rendered in the left column (e.g. Avatar, icon). Omit for a default timeline node. |
| `children`  | `React.ReactNode` | -       | Content for the item row (text, badges, links, etc.).                                      |
| `className` | `string`          | -       | Additional CSS classes.                                                                    |

---

## See also

- [Avatar](./avatar.md) — underlying avatar primitive used for profile images and initials
