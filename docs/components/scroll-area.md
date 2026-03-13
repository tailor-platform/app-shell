# ScrollArea

Custom scrollable container with styled scrollbars.

## Parts

| Part                   | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `ScrollArea.Root`      | Scrollable container (includes viewport, scrollbars, and corner) |
| `ScrollArea.ScrollBar` | Individual scrollbar (vertical or horizontal)                    |

## Example

```tsx
import { ScrollArea } from "@tailor-platform/app-shell";

<ScrollArea.Root className="h-72 w-48">
  <div>{/* Long content */}</div>
</ScrollArea.Root>;
```
