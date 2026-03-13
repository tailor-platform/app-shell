# Radio

Radio button input.

## Parts

| Part          | Description                              |
| ------------- | ---------------------------------------- |
| `Radio.Root`  | Single radio button (includes indicator) |
| `Radio.Group` | Groups related radio buttons             |

## Example

```tsx
import { Radio } from "@tailor-platform/app-shell";

<Radio.Group defaultValue="option-1">
  <label>
    <Radio.Root value="option-1" /> Option 1
  </label>
  <label>
    <Radio.Root value="option-2" /> Option 2
  </label>
  <label>
    <Radio.Root value="option-3" /> Option 3
  </label>
</Radio.Group>;
```
