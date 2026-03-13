# Dialog

Modal dialog with overlay.

## Parts

| Part                 | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `Dialog.Root`        | Root provider                                               |
| `Dialog.Trigger`     | Open trigger                                                |
| `Dialog.Portal`      | Portal container                                            |
| `Dialog.Close`       | Close button                                                |
| `Dialog.Overlay`     | Background overlay                                          |
| `Dialog.Content`     | Dialog content (includes overlay, portal, and close button) |
| `Dialog.Header`      | Header container                                            |
| `Dialog.Footer`      | Footer container                                            |
| `Dialog.Title`       | Dialog title                                                |
| `Dialog.Description` | Dialog description                                          |

## Example

```tsx
import { Dialog, Button } from "@tailor-platform/app-shell";

<Dialog.Root>
  <Dialog.Trigger>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit Profile</Dialog.Title>
      <Dialog.Description>Make changes to your profile here.</Dialog.Description>
    </Dialog.Header>
    {/* form content */}
    <Dialog.Footer>
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>;
```
