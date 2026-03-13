# Checkbox

Checkbox input with indeterminate state support.

## Parts

| Part             | Description                                      |
| ---------------- | ------------------------------------------------ |
| `Checkbox.Root`  | Single checkbox (includes check/minus indicator) |
| `Checkbox.Group` | Groups related checkboxes                        |

## Example

```tsx
import { Checkbox } from "@tailor-platform/app-shell";

{
  /* Single checkbox */
}
<Checkbox.Root />;

{
  /* Group of checkboxes */
}
<Checkbox.Group>
  <label>
    <Checkbox.Root /> Option A
  </label>
  <label>
    <Checkbox.Root /> Option B
  </label>
</Checkbox.Group>;
```
