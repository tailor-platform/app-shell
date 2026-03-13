# Progress

Determinate progress bar.

## Parts

| Part                 | Description         |
| -------------------- | ------------------- |
| `Progress.Root`      | Root provider       |
| `Progress.Track`     | Track container     |
| `Progress.Indicator` | Value indicator bar |

## Props (`Progress.Root`)

| Prop    | Type     | Description            |
| ------- | -------- | ---------------------- |
| `value` | `number` | Current progress value |
| `min`   | `number` | Minimum value          |
| `max`   | `number` | Maximum value          |

## Example

```tsx
import { Progress } from "@tailor-platform/app-shell";

// Simple usage (default Track + Indicator)
<Progress.Root value={60} />

// Composable usage
<Progress.Root value={60}>
  <Progress.Track>
    <Progress.Indicator />
  </Progress.Track>
</Progress.Root>
```
