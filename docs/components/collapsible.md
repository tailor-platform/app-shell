# Collapsible

Expandable/collapsible content section.

## Parts

| Part                  | Description       |
| --------------------- | ----------------- |
| `Collapsible.Root`    | Root provider     |
| `Collapsible.Trigger` | Toggle button     |
| `Collapsible.Content` | Collapsible panel |

## Example

```tsx
import { Collapsible } from "@tailor-platform/app-shell";

<Collapsible.Root>
  <Collapsible.Trigger>Toggle</Collapsible.Trigger>
  <Collapsible.Content>Collapsible content here.</Collapsible.Content>
</Collapsible.Root>;
```
