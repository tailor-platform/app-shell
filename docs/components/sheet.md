# Sheet

Side panel that slides in from the edge.

## Parts

| Part                | Description                                        |
| ------------------- | -------------------------------------------------- |
| `Sheet.Root`        | Root provider                                      |
| `Sheet.Trigger`     | Open trigger                                       |
| `Sheet.Close`       | Close button                                       |
| `Sheet.Content`     | Slide-in panel (includes overlay and close button) |
| `Sheet.Header`      | Header container                                   |
| `Sheet.Footer`      | Footer container                                   |
| `Sheet.Title`       | Sheet title                                        |
| `Sheet.Description` | Sheet description                                  |

## Props (`Sheet.Content`)

| Prop   | Type                                     | Default   | Description              |
| ------ | ---------------------------------------- | --------- | ------------------------ |
| `side` | `"top" \| "right" \| "bottom" \| "left"` | `"right"` | Which edge to slide from |

## Example

```tsx
import { Sheet, Button } from "@tailor-platform/app-shell";

<Sheet.Root>
  <Sheet.Trigger>
    <Button variant="outline">Open Sheet</Button>
  </Sheet.Trigger>
  <Sheet.Content side="right">
    <Sheet.Header>
      <Sheet.Title>Edit Settings</Sheet.Title>
      <Sheet.Description>Make changes to your settings.</Sheet.Description>
    </Sheet.Header>
    {/* content */}
    <Sheet.Footer>
      <Button>Save</Button>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>;
```
