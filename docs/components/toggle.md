# Toggle

Pressable toggle button.

## Parts

| Part           | Description                   |
| -------------- | ----------------------------- |
| `Toggle.Root`  | Single toggle button          |
| `Toggle.Group` | Groups related toggle buttons |

## Props (Toggle.Root)

| Prop      | Type                        | Default     | Description  |
| --------- | --------------------------- | ----------- | ------------ |
| `variant` | `"default" \| "outline"`    | `"default"` | Visual style |
| `size`    | `"default" \| "sm" \| "lg"` | `"default"` | Button size  |

## Example

```tsx
import { Toggle } from "@tailor-platform/app-shell";
import { Bold, Italic, Underline } from "lucide-react";

{
  /* Single toggle */
}
<Toggle.Root aria-label="Toggle bold">
  <Bold className="size-4" />
</Toggle.Root>;

{
  /* Toggle group */
}
<Toggle.Group>
  <Toggle.Root aria-label="Bold">
    <Bold className="size-4" />
  </Toggle.Root>
  <Toggle.Root aria-label="Italic">
    <Italic className="size-4" />
  </Toggle.Root>
  <Toggle.Root aria-label="Underline">
    <Underline className="size-4" />
  </Toggle.Root>
</Toggle.Group>;
```
