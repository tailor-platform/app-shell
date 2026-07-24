---
title: Dialog
description: Modal dialog with a compound component API
---

# Dialog

The `Dialog` component provides a modal dialog with a compound component API. It is backed by Base UI's Dialog primitive.

## Import

```tsx
import { Dialog } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Dialog.Root>
  <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Confirm Action</Dialog.Title>
      <Dialog.Description>Are you sure you want to proceed?</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
      <Button>Confirm</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

## Sub-components

| Sub-component        | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `Dialog.Root`        | Manages open/close state                                                |
| `Dialog.Trigger`     | Element that opens the dialog when clicked                              |
| `Dialog.Content`     | The main dialog panel (includes overlay and close button automatically) |
| `Dialog.Header`      | Layout wrapper for title and description                                |
| `Dialog.Footer`      | Layout wrapper for action buttons                                       |
| `Dialog.Title`       | Dialog title (announced by screen readers)                              |
| `Dialog.Description` | Additional context below the title                                      |
| `Dialog.Close`       | Button that closes the dialog                                           |

## Props

### Dialog.Root Props

| Prop           | Type                      | Default | Description                       |
| -------------- | ------------------------- | ------- | --------------------------------- |
| `open`         | `boolean`                 | -       | Controlled open state             |
| `defaultOpen`  | `boolean`                 | `false` | Initial open state (uncontrolled) |
| `onOpenChange` | `(open: boolean) => void` | -       | Callback when open state changes  |
| `modal`        | `boolean`                 | `true`  | Whether the dialog is modal       |
| `children`     | `React.ReactNode`         | -       | Dialog sub-components             |

### Dialog.Content Props

Accepts `className` and all standard HTML `<div>` props.

### Dialog.Trigger / Dialog.Close Props

Accept a `render` prop for custom element rendering (Base UI render pattern), plus standard button props.

## Controlled Usage

```tsx
const [open, setOpen] = useState(false);

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger render={<Button variant="outline" />}>Open Dialog</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
    </Dialog.Header>
    <Dialog.Footer>
      <Button onClick={() => setOpen(false)}>Done</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>;
```

## Examples

### Delete Confirmation

```tsx
function DeleteConfirmation({ onDelete }: { onDelete: () => void }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="destructive" />}>Delete</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete Order</Dialog.Title>
          <Dialog.Description>
            This action cannot be undone. The order will be permanently deleted.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
```

### Form Dialog

```tsx
function EditDialog({ item }: { item: Item }) {
  const [name, setName] = useState(item.name);

  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" />}>Edit</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Edit Item</Dialog.Title>
        </Dialog.Header>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={() => handleSave(name)}>Save</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
```

## Accessibility

- Dialog title is announced by screen readers via `Dialog.Title`
- Focus is trapped inside the dialog while open
- Pressing `Escape` closes the dialog
- The close button is always present inside `Dialog.Content`

## Related Components

- [Sheet](./sheet.md) - Slide-in panel alternative for non-modal workflows
- [Button](./button.md) - Use as trigger and action buttons
