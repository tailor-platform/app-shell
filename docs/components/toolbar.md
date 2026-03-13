# Toolbar

Horizontal toolbar with buttons, separators, and groups.

## Parts

| Part                | Description            |
| ------------------- | ---------------------- |
| `Toolbar.Root`      | Toolbar container      |
| `Toolbar.Button`    | Toolbar button         |
| `Toolbar.Separator` | Vertical separator     |
| `Toolbar.Group`     | Groups related buttons |
| `Toolbar.Link`      | Toolbar link           |

## Example

```tsx
import { Toolbar } from "@tailor-platform/app-shell";

<Toolbar.Root>
  <Toolbar.Group>
    <Toolbar.Button>Cut</Toolbar.Button>
    <Toolbar.Button>Copy</Toolbar.Button>
    <Toolbar.Button>Paste</Toolbar.Button>
  </Toolbar.Group>
  <Toolbar.Separator />
  <Toolbar.Link href="/help">Help</Toolbar.Link>
</Toolbar.Root>;
```
