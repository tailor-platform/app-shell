---
"@tailor-platform/app-shell": minor
---

Add composable `Timeline` primitives for building time-based layouts, including axis guides/levels, row backgrounds, intervals, and dependency links.

- `Timeline.Root` defines the shared start/end range.
- `Timeline.Viewport` renders the axis, decorations, scrolling area, and link layer.
- `Timeline.Row` defines one timeline lane and owns row height/background.
- `Timeline.Interval` positions content across a time range.
- `Timeline.Link` draws dependency lines between timeline items.

```tsx
import { Timeline } from "@tailor-platform/app-shell";

<Timeline.Root start={0} end={100}>
  <Timeline.Viewport
    axis={{
      guides: [{ at: 0 }, { at: 50 }, { at: 100 }],
      levels: [
        {
          kind: "spans",
          items: [
            { start: 0, end: 50, label: "Phase 1" },
            { start: 50, end: 100, label: "Phase 2" },
          ],
        },
      ],
    }}
  >
    <Timeline.Row height={40}>
      <Timeline.Interval start={10} end={35}>
        <div className="h-full rounded-md bg-primary" />
      </Timeline.Interval>
    </Timeline.Row>
  </Timeline.Viewport>
</Timeline.Root>;
```

`Tooltip.Content` also now accepts `noArrow` for popover-like timeline labels and custom overlays.
