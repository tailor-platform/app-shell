---
title: ActivityCard
description: Timeline of recent document activities with avatars and overflow dialog
---

# ActivityCard

The `ActivityCard` component displays a timeline of recent activities (e.g. changes on a PO, SO, or GR document). Each entry shows an avatar, user name, description, and timestamp. A limited number of activities are shown in the card; additional activities are available via a clickable overflow that opens a dialog with a scrollable full list.

## Import

```tsx
import { ActivityCard } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
const activities = [
  {
    id: "1",
    userDisplayName: "Hanna",
    userAvatarUrl: "/avatars/hanna.jpg", // optional
    description: "changed the status from DRAFT to CONFIRMED",
    timestamp: new Date("2025-03-21T09:00:00"),
  },
  {
    id: "2",
    userDisplayName: "Pradeep Kumar",
    description: "created this PO",
    timestamp: new Date("2025-03-21T15:16:00"),
  },
];

<ActivityCard activities={activities} title="Updates" />
```

## Overflow and dialog

By default the card shows the 6 most recent activities. If there are more, a button appears at the bottom (e.g. **"2 more activities"**). Clicking it opens a modal dialog titled "All activities" with the full list in a scrollable area. The overflow label can be switched to a count style (**"+2"**) via the `overflowLabel` prop.

```tsx
<ActivityCard
  activities={manyActivities}
  title="Updates"
  maxVisible={6}
  overflowLabel="more"
/>
// or overflowLabel="count" for "+N"
```

## Grouping by day

Set `groupBy="day"` to group activities under labels like "TODAY", "YESTERDAY", or a formatted date.

```tsx
<ActivityCard
  activities={activities}
  title="Updates"
  groupBy="day"
/>
```

## Props

| Prop            | Type                               | Default  | Description                                      |
| --------------- | ---------------------------------- | -------- | ------------------------------------------------ |
| `activities`    | `ActivityCardActivity[]`           | required | List of activities (newest first).               |
| `title`        | `string`                           | -        | Card title, e.g. "Updates".                      |
| `maxVisible`   | `number`                           | `6`      | Max activities shown in the card before overflow.|
| `overflowLabel`| `"more" \| "count"`                | `"more"` | "N more activities" vs "+N".                     |
| `groupBy`       | `"none" \| "day"`                 | `"none"` | Optional grouping by day.                       |
| `className`     | `string`                           | -        | Applied to the card root.                        |

Each activity must include: `id`, `userDisplayName`, `description`, `timestamp` (Date or string). Optional: `userAvatarUrl` (fallback is initials).
