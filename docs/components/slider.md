# Slider

Range slider input.

## Parts

| Part             | Description                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `Slider.Root`    | Root provider with built-in track and thumb (accepts `defaultValue`, `min`, `max`, `step`) |
| `Slider.Control` | Slider control container                                                                   |
| `Slider.Track`   | Track with range indicator                                                                 |
| `Slider.Thumb`   | Draggable thumb                                                                            |

## Example

```tsx
import { Slider } from "@tailor-platform/app-shell";

<Slider.Root defaultValue={[50]} min={0} max={100} step={1} />;
```
