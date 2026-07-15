---
title: Timeline
description: Composable primitives for building time-based layouts with axis guides, row backgrounds, intervals, and dependency links
---

# Timeline

`Timeline` provides composable primitives for building time-based layouts such as Gantt charts, schedules, and project timelines. It is a compound component with five sub-components: `Root`, `Viewport`, `Row`, `Interval`, and `Link`.

## Import

```tsx
import { Timeline } from "@tailor-platform/app-shell";
```

## Basic Usage

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

## Sub-components

| Sub-component       | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `Timeline.Root`     | Provides the shared time range for all nested timeline primitives              |
| `Timeline.Viewport` | Renders the axis, decorations, scrolling area, and link overlay layer          |
| `Timeline.Row`      | Defines one horizontal lane with a fixed height and optional background        |
| `Timeline.Interval` | Positions content across a time range inside a row                             |
| `Timeline.Link`     | Draws an orthogonal dependency connector between two named `Interval` elements |

## TimeValue

All time position props (`start`, `end`, `at`) accept either a `Date` object or a millisecond-precision number timestamp.

```tsx
// Using Date objects
<Timeline.Root start={new Date("2024-01-01")} end={new Date("2024-12-31")}>

// Using numeric timestamps
<Timeline.Root start={0} end={100}>
```

## Props

### Timeline.Root Props

| Prop        | Type              | Default | Description                                        |
| ----------- | ----------------- | ------- | -------------------------------------------------- |
| `start`     | `Date \| number`  | —       | Inclusive start of the overall timeline range      |
| `end`       | `Date \| number`  | —       | Inclusive end of the overall timeline range        |
| `children`  | `React.ReactNode` | —       | Timeline subtree, usually a `Timeline.Viewport`    |
| `className` | `string`          | —       | Additional CSS classes applied to the root element |
| `style`     | `CSSProperties`   | —       | Inline style applied to the root element           |

### Timeline.Viewport Props

| Prop           | Type                   | Default | Description                                                           |
| -------------- | ---------------------- | ------- | --------------------------------------------------------------------- |
| `children`     | `React.ReactNode`      | —       | Rows and links, in any order                                          |
| `axis`         | `TimelineAxis`         | —       | Axis configuration: guides and stacked header levels                  |
| `decorations`  | `TimelineDecorations`  | —       | Decorative layers: bands and markers                                  |
| `linkDefaults` | `TimelineLinkDefaults` | —       | Shared defaults applied to all `Timeline.Link` nodes in this viewport |
| `canvasWidth`  | `number`               | —       | Fixed canvas width in pixels for horizontally scrollable timelines    |
| `stickyAxis`   | `boolean`              | `false` | Pins the axis to the top of the viewport during vertical scrolling    |
| `className`    | `string`               | —       | Additional CSS classes applied to the scroll viewport                 |
| `style`        | `CSSProperties`        | —       | Inline style applied to the scroll viewport                           |

### Timeline.Row Props

| Prop         | Type                            | Default | Description                                                                                 |
| ------------ | ------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `children`   | `React.ReactNode`               | —       | Row contents, typically `Timeline.Interval` elements                                        |
| `height`     | `number`                        | `32`    | Row height in pixels                                                                        |
| `background` | `TimelineRowBackground \| null` | —       | Optional background rendered in a dedicated layer, in front of bands but behind guide lines |
| `className`  | `string`                        | —       | Additional CSS classes applied to the row content container                                 |
| `style`      | `CSSProperties`                 | —       | Inline style applied to the row content container                                           |

### Timeline.Interval Props

| Prop        | Type              | Default | Description                                                         |
| ----------- | ----------------- | ------- | ------------------------------------------------------------------- |
| `start`     | `Date \| number`  | —       | Start of the interval                                               |
| `end`       | `Date \| number`  | —       | End of the interval                                                 |
| `children`  | `React.ReactNode` | —       | Rendered content for the interval                                   |
| `id`        | `string`          | —       | Stable id used by `Timeline.Link` to reference this interval        |
| `insetY`    | `number`          | `0`     | Top and bottom inset in pixels within the row                       |
| `className` | `string`          | —       | Additional CSS classes applied to the positioned interval container |
| `style`     | `CSSProperties`   | —       | Inline style applied to the positioned interval container           |

### Timeline.Link Props

| Prop          | Type                           | Default   | Description                                       |
| ------------- | ------------------------------ | --------- | ------------------------------------------------- |
| `from`        | `string`                       | —         | Source `Timeline.Interval` id                     |
| `to`          | `string`                       | —         | Target `Timeline.Interval` id                     |
| `fromAnchor`  | `"start" \| "center" \| "end"` | `"end"`   | Source anchor used for routing                    |
| `toAnchor`    | `"start" \| "center" \| "end"` | `"start"` | Target anchor used for routing                    |
| `arrow`       | `boolean`                      | —         | Overrides the viewport-level `linkDefaults.arrow` |
| `gap`         | `number`                       | —         | Overrides the viewport-level `linkDefaults.gap`   |
| `strokeWidth` | `number`                       | —         | Optional stroke width for the link path           |
| `className`   | `string`                       | —         | Additional CSS classes applied to the link SVG    |
| `style`       | `CSSProperties`                | —         | Inline style applied to the link SVG              |

## Type Reference

### TimelineAxis

Axis configuration for `Timeline.Viewport`.

| Field       | Type                  | Description                                           |
| ----------- | --------------------- | ----------------------------------------------------- |
| `guides`    | `TimelineGuide[]`     | Vertical boundary lines rendered in the axis and body |
| `levels`    | `TimelineAxisLevel[]` | Stacked header levels rendered above the body         |
| `className` | `string`              | Optional class applied to the axis container          |

### TimelineAxisLevel

A stacked axis level. Has a discriminated union `kind` field:

- `kind: "spans"` — renders labeled time ranges (`TimelineAxisSpan[]`)
- `kind: "ticks"` — renders labeled point-in-time markers (`TimelineAxisTick[]`)

| Field       | Type                                       | Default | Description                                   |
| ----------- | ------------------------------------------ | ------- | --------------------------------------------- |
| `kind`      | `"spans" \| "ticks"`                       | —       | Level rendering mode                          |
| `items`     | `TimelineAxisSpan[] \| TimelineAxisTick[]` | —       | Items to render in this level                 |
| `height`    | `number`                                   | `28`    | Height of this axis level in pixels           |
| `className` | `string`                                   | —       | Optional class applied to the level container |

### TimelineGuide

A vertical guide line rendered in both the axis and the body.

| Field           | Type             | Description                                      |
| --------------- | ---------------- | ------------------------------------------------ |
| `at`            | `Date \| number` | Time position for the guide line                 |
| `key`           | `React.Key`      | Optional stable React key                        |
| `axisClassName` | `string`         | Optional class for the axis portion of the guide |
| `axisStyle`     | `CSSProperties`  | Optional style for the axis portion of the guide |
| `bodyClassName` | `string`         | Optional class for the body portion of the guide |
| `bodyStyle`     | `CSSProperties`  | Optional style for the body portion of the guide |

### TimelineDecorations

Decorative layers rendered by `Timeline.Viewport`.

| Field     | Type               | Description                                       |
| --------- | ------------------ | ------------------------------------------------- |
| `bands`   | `TimelineBand[]`   | Background range highlights rendered behind rows  |
| `markers` | `TimelineMarker[]` | Vertical markers rendered in the axis and/or body |

### TimelineBand

A decorative horizontal band rendered behind rows.

| Field       | Type             | Description                                |
| ----------- | ---------------- | ------------------------------------------ |
| `start`     | `Date \| number` | Start of the band                          |
| `end`       | `Date \| number` | End of the band                            |
| `key`       | `React.Key`      | Optional stable React key                  |
| `color`     | `string`         | Optional background color convenience prop |
| `className` | `string`         | Optional class applied to the band element |
| `style`     | `CSSProperties`  | Optional inline style applied to the band  |

### TimelineMarker

A decorative vertical marker line.

| Field            | Type                         | Default  | Description                                        |
| ---------------- | ---------------------------- | -------- | -------------------------------------------------- |
| `at`             | `Date \| number`             | —        | Time position for the marker                       |
| `key`            | `React.Key`                  | —        | Optional stable React key                          |
| `color`          | `string`                     | —        | Optional line color convenience prop               |
| `label`          | `React.ReactNode`            | —        | Optional marker label                              |
| `placement`      | `"axis" \| "body" \| "both"` | `"body"` | Controls where the marker is rendered              |
| `className`      | `string`                     | —        | Optional class applied to the outer marker wrapper |
| `lineClassName`  | `string`                     | —        | Optional class applied to the marker line          |
| `labelClassName` | `string`                     | —        | Optional class applied to the marker label         |

### TimelineLinkDefaults

Shared defaults for all `Timeline.Link` nodes inside one viewport.

| Field         | Type            | Default        | Description                                              |
| ------------- | --------------- | -------------- | -------------------------------------------------------- |
| `routing`     | `"orthogonal"`  | `"orthogonal"` | Link routing strategy                                    |
| `arrow`       | `boolean`       | `true`         | Whether links end with an arrow marker                   |
| `gap`         | `number`        | `16`           | Horizontal gap in px used when routing out of/into items |
| `strokeWidth` | `number`        | —              | Optional default stroke width for link paths             |
| `className`   | `string`        | —              | Optional class applied to each link SVG                  |
| `style`       | `CSSProperties` | —              | Optional style applied to each link SVG                  |

### TimelineRowBackground

Background content for a row rendered in a dedicated layer (in front of bands, behind guides).

| Field       | Type            | Description                                            |
| ----------- | --------------- | ------------------------------------------------------ |
| `className` | `string`        | Optional class applied to the background layer element |
| `style`     | `CSSProperties` | Optional style applied to the background layer element |

## Examples

### Horizontal Scrolling

Use `canvasWidth` on `Timeline.Viewport` to enable horizontal scrolling:

```tsx
<Timeline.Root start={projectStart} end={projectEnd}>
  <Timeline.Viewport canvasWidth={2400} axis={axis}>
    {rows}
  </Timeline.Viewport>
</Timeline.Root>
```

### Sticky Axis

Pin the axis to the top during vertical scrolling with `stickyAxis`:

```tsx
<Timeline.Root start={0} end={100}>
  <Timeline.Viewport stickyAxis axis={axis}>
    {rows}
  </Timeline.Viewport>
</Timeline.Root>
```

### Dependency Links

Use `id` on `Timeline.Interval` and `Timeline.Link` to draw dependency connectors:

```tsx
<Timeline.Root start={0} end={100}>
  <Timeline.Viewport
    linkDefaults={{ style: { color: "var(--muted-foreground)" }, strokeWidth: 1.5 }}
  >
    <Timeline.Row height={40}>
      <Timeline.Interval id="task-a" start={10} end={40}>
        <div className="h-full rounded-md bg-primary" />
      </Timeline.Interval>
    </Timeline.Row>
    <Timeline.Row height={40}>
      <Timeline.Interval id="task-b" start={50} end={80}>
        <div className="h-full rounded-md bg-secondary" />
      </Timeline.Interval>
    </Timeline.Row>
    <Timeline.Link from="task-a" to="task-b" />
  </Timeline.Viewport>
</Timeline.Root>
```

### Background Bands and Markers

Use `decorations` to add background highlights and vertical marker lines:

```tsx
<Timeline.Viewport
  axis={axis}
  decorations={{
    bands: [
      {
        start: freezeStart,
        end: freezeEnd,
        color: "var(--destructive/10)",
        className: "astw:border-x astw:border-destructive/30",
      },
    ],
    markers: [
      {
        at: today,
        color: "var(--primary)",
        label: <span className="astw:text-xs astw:text-primary">Today</span>,
      },
    ],
  }}
>
  {rows}
</Timeline.Viewport>
```

### Row Background

Use `background` on `Timeline.Row` to apply a background that respects guide lines:

```tsx
<Timeline.Row height={40} background={{ style: { background: "var(--muted)" } }}>
  <Timeline.Interval start={10} end={35}>
    <div className="h-full rounded-md bg-primary" />
  </Timeline.Interval>
</Timeline.Row>
```
