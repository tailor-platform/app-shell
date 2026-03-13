# Accordion

Collapsible content sections.

## Parts

| Part                | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `Accordion.Root`    | Container for all accordion items                       |
| `Accordion.Item`    | Individual collapsible section                          |
| `Accordion.Trigger` | Button that toggles the section (includes chevron icon) |
| `Accordion.Content` | Collapsible panel content                               |

## Example

```tsx
import { Accordion } from "@tailor-platform/app-shell";

<Accordion.Root>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>Section 1</Accordion.Trigger>
    <Accordion.Content>Content for section 1</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="item-2">
    <Accordion.Trigger>Section 2</Accordion.Trigger>
    <Accordion.Content>Content for section 2</Accordion.Content>
  </Accordion.Item>
</Accordion.Root>;
```
