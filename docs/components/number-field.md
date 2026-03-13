# NumberField

Numeric input with increment/decrement buttons.

## Parts

| Part                    | Description                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| `NumberField.Root`      | Root provider (accepts `value`, `onValueChange`, `min`, `max`, `step`, etc.) |
| `NumberField.Input`     | Numeric input                                                                |
| `NumberField.Group`     | Container for input + buttons                                                |
| `NumberField.Increment` | Increment button (includes chevron icon)                                     |
| `NumberField.Decrement` | Decrement button (includes chevron icon)                                     |

## Example

```tsx
import { NumberField } from "@tailor-platform/app-shell";

<NumberField.Root defaultValue={0} min={0} max={100}>
  <NumberField.Group>
    <NumberField.Input />
    <NumberField.Increment />
    <NumberField.Decrement />
  </NumberField.Group>
</NumberField.Root>;
```
