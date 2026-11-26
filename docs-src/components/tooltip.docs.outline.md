---
kind: code-backed
group: tooltip
title: Tooltip
description: Hover/focus tooltip with configurable placement and shared delay via Tooltip.Provider
sources:
  - packages/core/src/components/tooltip/**
---

# Tooltip

The `Tooltip` component displays contextual information on hover or focus. It is backed by Base UI's Tooltip primitive.

## Import

```tsx
import { Tooltip } from "@tailor-platform/app-shell";
```

The examples below also import `useState` from `react`, `Button` and `Text` from `@tailor-platform/app-shell`, and `PencilIcon` from `lucide-react`.

## Basic Usage

<!-- example: basic-usage -->

## Sub-components

| Sub-component      | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `Tooltip.Provider` | Provides shared delay configuration for all nested tooltips |
| `Tooltip.Root`     | Manages tooltip open/close state                            |
| `Tooltip.Trigger`  | Element that shows the tooltip on hover or focus            |
| `Tooltip.Content`  | The tooltip popup containing the help text                  |

## Props

### Tooltip.Provider Props

Wrap a section of your UI (e.g. a toolbar) with `Tooltip.Provider` to share delay settings across multiple tooltips.

| Prop         | Type              | Default | Description                                                                                |
| ------------ | ----------------- | ------- | ------------------------------------------------------------------------------------------ |
| `delay`      | `number`          | `0`     | Delay in ms before the tooltip opens (milliseconds)                                        |
| `closeDelay` | `number`          | -       | Delay in ms before the tooltip closes                                                      |
| `timeout`    | `number`          | `400`   | Window in ms during which the next tooltip opens immediately after the previous one closes |
| `children`   | `React.ReactNode` | -       | Nested tooltip components                                                                  |

### Tooltip.Root Props

| Prop           | Type                      | Default | Description                       |
| -------------- | ------------------------- | ------- | --------------------------------- |
| `open`         | `boolean`                 | -       | Controlled open state             |
| `defaultOpen`  | `boolean`                 | `false` | Initial open state (uncontrolled) |
| `onOpenChange` | `(open: boolean) => void` | -       | Callback when open state changes  |
| `children`     | `React.ReactNode`         | -       | Tooltip sub-components            |

### Tooltip.Content Props

| Prop        | Type              | Default                                           | Description                                               |
| ----------- | ----------------- | ------------------------------------------------- | --------------------------------------------------------- |
| `position`  | `PositionProps`   | `{ side: "top", align: "center", sideOffset: 5 }` | Preferred placement of the tooltip.                       |
| `noArrow`   | `boolean`         | `false`                                           | When `true`, suppresses the arrow indicator on the popup. |
| `className` | `string`          | -                                                 | Additional CSS classes.                                   |
| `children`  | `React.ReactNode` | -                                                 | Tooltip text or content.                                  |

[`PositionProps`](./menu.md#positionprops) is the public placement type shared with `Menu.Content`. Use `position={{ side: "right", align: "start" }}` to configure placement. The old flat `side`, `align`, and `sideOffset` props remain supported but deprecated; they are ignored when `position` is supplied.

## Placement

<!-- example: placement -->

## Shared Delay with Provider

Use `Tooltip.Provider` to avoid tooltips opening immediately in dense UIs like toolbars:

Hover a help button and wait for the initial 600 ms delay, then move directly to its neighbor. Once a tooltip is visible, the provider's shared timeout lets adjacent tooltips open immediately. Keyboard focus also reveals the help.

<!-- example: shared-delay -->

## Examples

### Icon Button with Tooltip

<!-- example: icon-button -->

### Controlled Tooltip

Use **Show tooltip** and **Hide tooltip** to set the open state from outside the trigger. Explicit actions avoid toggling twice when the tooltip also dismisses on an outside press. Hovering or focusing **Details target** updates the same controlled state, reflected in the status text.

<!-- example: controlled-tooltip -->

## Accessibility

- Tooltip content is rendered in a portal
- Trigger receives focus and keyboard activation support
- `sr-only` text on icon-only triggers is recommended for screen readers

## Related Components

- [Button](./button.md) - Common trigger element for tooltips
