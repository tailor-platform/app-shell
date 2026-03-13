# PreviewCard

Hover card that shows a preview.

## Parts

| Part                  | Description               |
| --------------------- | ------------------------- |
| `PreviewCard.Root`    | Root provider             |
| `PreviewCard.Trigger` | Hover trigger             |
| `PreviewCard.Content` | Preview content popup     |
| `PreviewCard.Arrow`   | Arrow pointing to trigger |

## Props (`PreviewCard.Content`)

| Prop         | Type                                     | Default    | Description           |
| ------------ | ---------------------------------------- | ---------- | --------------------- |
| `sideOffset` | `number`                                 | `4`        | Distance from trigger |
| `side`       | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"` | Preferred side        |
| `align`      | `"start" \| "center" \| "end"`           | `"center"` | Alignment             |

## Example

```tsx
import { PreviewCard } from "@tailor-platform/app-shell";

<PreviewCard.Root>
  <PreviewCard.Trigger>
    <a href="/profile">@johndoe</a>
  </PreviewCard.Trigger>
  <PreviewCard.Content>
    <p>John Doe - Software Engineer</p>
  </PreviewCard.Content>
</PreviewCard.Root>;
```
