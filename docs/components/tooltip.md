---
title: Tooltip
description: Hover/focus tooltip with configurable placement and shared delay via Tooltip.Provider
---

# Tooltip

The `Tooltip` component displays contextual information on hover or focus. It is backed by Base UI's Tooltip primitive.

## Import

```tsx
import { Tooltip } from "@tailor-platform/app-shell"
```

## Basic Usage

```tsx preview
import { Button, Tooltip } from "@tailor-platform/app-shell"
;<Tooltip.Root>
  <Tooltip.Trigger render={<Button variant="outline" />}>Hover me</Tooltip.Trigger>
  <Tooltip.Content>Helpful information</Tooltip.Content>
</Tooltip.Root>
```

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

| Prop         | Type              | Default | Description                                         |
| ------------ | ----------------- | ------- | --------------------------------------------------- |
| `delay`      | `number`          | `0`     | Delay in ms before the tooltip opens (milliseconds) |
| `closeDelay` | `number`          | -       | Delay in ms before the tooltip closes               |
| `timeout`    | `number`          | -       | Timeout in ms after which the tooltip auto-closes   |
| `children`   | `React.ReactNode` | -       | Nested tooltip components                           |

### Tooltip.Root Props

| Prop           | Type                      | Default | Description                       |
| -------------- | ------------------------- | ------- | --------------------------------- |
| `open`         | `boolean`                 | -       | Controlled open state             |
| `defaultOpen`  | `boolean`                 | `false` | Initial open state (uncontrolled) |
| `onOpenChange` | `(open: boolean) => void` | -       | Callback when open state changes  |
| `children`     | `React.ReactNode`         | -       | Tooltip sub-components            |

### Tooltip.Content Props

| Prop         | Type                                     | Default    | Description                        |
| ------------ | ---------------------------------------- | ---------- | ---------------------------------- |
| `side`       | `"top" \| "right" \| "bottom" \| "left"` | `"top"`    | Preferred placement of the tooltip |
| `align`      | `"start" \| "center" \| "end"`           | `"center"` | Alignment along the placement axis |
| `sideOffset` | `number`                                 | `5`        | Distance in px from the trigger    |
| `className`  | `string`                                 | -          | Additional CSS classes             |
| `children`   | `React.ReactNode`                        | -          | Tooltip text or content            |

## Placement

```tsx preview
import { Button, Tooltip } from "@tailor-platform/app-shell"
;<Tooltip.Root>
  <Tooltip.Trigger render={<Button />}>Trigger</Tooltip.Trigger>
  <Tooltip.Content side="right" align="start">
    Appears on the right
  </Tooltip.Content>
</Tooltip.Root>
```

## Shared Delay with Provider

Use `Tooltip.Provider` to avoid tooltips opening immediately in dense UIs like toolbars:

```tsx
<Tooltip.Provider delay={300}>
  <Toolbar>
    <Tooltip.Root>
      <Tooltip.Trigger render={<Button size="icon" />}>
        <BoldIcon />
      </Tooltip.Trigger>
      <Tooltip.Content>Bold</Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root>
      <Tooltip.Trigger render={<Button size="icon" />}>
        <ItalicIcon />
      </Tooltip.Trigger>
      <Tooltip.Content>Italic</Tooltip.Content>
    </Tooltip.Root>
  </Toolbar>
</Tooltip.Provider>
```

## Examples

### Icon Button with Tooltip

```tsx preview
import { Button, Tooltip } from "@tailor-platform/app-shell"
import { PencilIcon } from "lucide-react"
;<Tooltip.Root>
  <Tooltip.Trigger render={<Button size="icon" variant="ghost" />}>
    <PencilIcon />
    <span className="astw:sr-only">Edit</span>
  </Tooltip.Trigger>
  <Tooltip.Content>Edit order</Tooltip.Content>
</Tooltip.Root>
```

### Controlled Tooltip

```tsx
const [open, setOpen] = useState(false)

;<Tooltip.Root open={open} onOpenChange={setOpen}>
  <Tooltip.Trigger render={<Button />}>Info</Tooltip.Trigger>
  <Tooltip.Content>Additional details here</Tooltip.Content>
</Tooltip.Root>
```

## Accessibility

- Tooltip content is rendered in a portal
- Trigger receives focus and keyboard activation support
- `sr-only` text on icon-only triggers is recommended for screen readers

## Related Components

- [Button](./button.md) - Common trigger element for tooltips
