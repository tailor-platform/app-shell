# AlertDialog

Modal dialog requiring user confirmation.

## Parts

| Part                      | Description                                  |
| ------------------------- | -------------------------------------------- |
| `AlertDialog.Root`        | Root provider                                |
| `AlertDialog.Trigger`     | Button that opens the dialog                 |
| `AlertDialog.Content`     | Dialog content (includes overlay and portal) |
| `AlertDialog.Header`      | Header container                             |
| `AlertDialog.Footer`      | Footer container (action buttons)            |
| `AlertDialog.Title`       | Dialog title                                 |
| `AlertDialog.Description` | Dialog description text                      |
| `AlertDialog.Action`      | Confirm action button                        |
| `AlertDialog.Cancel`      | Cancel button (closes dialog)                |

## Example

```tsx
import { AlertDialog } from "@tailor-platform/app-shell";

<AlertDialog.Root>
  <AlertDialog.Trigger>Delete Item</AlertDialog.Trigger>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onClick={handleDelete}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>;
```
