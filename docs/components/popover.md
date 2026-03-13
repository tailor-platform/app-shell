# Popover

Floating content anchored to a trigger.

## Parts

| Part              | Description                                       |
| ----------------- | ------------------------------------------------- |
| `Popover.Root`    | Root provider                                     |
| `Popover.Trigger` | Trigger element                                   |
| `Popover.Content` | Floating content (includes portal and positioner) |
| `Popover.Close`   | Close button                                      |
| `Popover.Arrow`   | Arrow pointing to trigger                         |

## Props (`Popover.Content`)

| Prop         | Type     | Default | Description           |
| ------------ | -------- | ------- | --------------------- |
| `sideOffset` | `number` | `4`     | Distance from trigger |

## Example

```tsx
import { Popover, Button } from "@tailor-platform/app-shell";

<Popover.Root>
  <Popover.Trigger>
    <Button variant="outline">Open Popover</Button>
  </Popover.Trigger>
  <Popover.Content>
    <p>Popover content here.</p>
  </Popover.Content>
</Popover.Root>;
```
