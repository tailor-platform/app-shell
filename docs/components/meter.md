# Meter

Meter/gauge indicator.

## Parts

| Part              | Description         |
| ----------------- | ------------------- |
| `Meter.Root`      | Root provider       |
| `Meter.Track`     | Track container     |
| `Meter.Indicator` | Value indicator bar |

## Props (`Meter.Root`)

| Prop    | Type     | Description   |
| ------- | -------- | ------------- |
| `value` | `number` | Current value |
| `min`   | `number` | Minimum value |
| `max`   | `number` | Maximum value |

## Example

```tsx
import { Meter } from "@tailor-platform/app-shell";

// Simple usage (default Track + Indicator)
<Meter.Root value={75} min={0} max={100} />

// Composable usage
<Meter.Root value={75} min={0} max={100}>
  <Meter.Track>
    <Meter.Indicator />
  </Meter.Track>
</Meter.Root>
```
