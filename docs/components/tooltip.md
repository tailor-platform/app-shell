# Tooltip

Informational tooltip on hover.

## Parts

| Part              | Description                              |
| ----------------- | ---------------------------------------- |
| `Tooltip.Root`    | Root provider (includes TooltipProvider) |
| `Tooltip.Trigger` | Hover target                             |
| `Tooltip.Content` | Tooltip content popup (includes arrow)   |

## Props (`Tooltip.Content`)

| Prop         | Type                                     | Default    | Description           |
| ------------ | ---------------------------------------- | ---------- | --------------------- |
| `sideOffset` | `number`                                 | `0`        | Distance from trigger |
| `side`       | `"top" \| "right" \| "bottom" \| "left"` | `"top"`    | Preferred side        |
| `align`      | `"start" \| "center" \| "end"`           | `"center"` | Alignment             |

## Example

```tsx
import { Tooltip, Button } from "@tailor-platform/app-shell";

<Tooltip.Root>
  <Tooltip.Trigger>
    <Button variant="outline">Hover me</Button>
  </Tooltip.Trigger>
  <Tooltip.Content>This is a tooltip</Tooltip.Content>
</Tooltip.Root>;
```
