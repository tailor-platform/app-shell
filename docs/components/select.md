# Select

Dropdown select input.

## Parts

| Part                | Description                                       |
| ------------------- | ------------------------------------------------- |
| `Select.Root`       | Root provider                                     |
| `Select.Trigger`    | Trigger button (includes chevron icon)            |
| `Select.Value`      | Displays selected value                           |
| `Select.Content`    | Dropdown content (includes portal and positioner) |
| `Select.Item`       | Individual option (includes check indicator)      |
| `Select.Group`      | Groups related options                            |
| `Select.GroupLabel` | Label for a group                                 |
| `Select.Separator`  | Visual separator between items                    |

## Example

```tsx
import { Select } from "@tailor-platform/app-shell";

<Select.Root>
  <Select.Trigger>
    <Select.Value placeholder="Select a fruit..." />
  </Select.Trigger>
  <Select.Content>
    <Select.Item value="apple">Apple</Select.Item>
    <Select.Item value="banana">Banana</Select.Item>
    <Select.Separator />
    <Select.Item value="cherry">Cherry</Select.Item>
  </Select.Content>
</Select.Root>;
```
