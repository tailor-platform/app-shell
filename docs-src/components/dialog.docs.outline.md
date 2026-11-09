---
kind: code-backed
group: dialog
title: Dialog
description: Modal dialog with a compound component API
sources:
  - packages/core/src/components/dialog/**
---

# Dialog

The `Dialog` component provides a modal dialog with a compound component API. It is backed by Base UI's Dialog primitive.

## Import

```tsx
import { Dialog } from "@tailor-platform/app-shell";
```

## Basic Usage

<!-- example: basic-usage -->

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

## Tall Content

`Dialog.Content` is never taller than the viewport minus 2rem (16px above and below, the same margin as on the sides). When the content is taller, the whole dialog scrolls, including the title and the close button. `Escape` and a click on the backdrop still close it.

On open, focus moves to the first control in the dialog. In a dialog that scrolls, this happens only when that control is in view at the top. When it is below the fold (for example, a footer button after a long body), the dialog itself takes focus instead, so it opens at the top rather than scrolled to that control. `Tab` then moves to the control. Pass `initialFocus` to choose the element yourself.

To keep a header or footer in view while only the body scrolls, make `Dialog.Content` a flex column and give the body `min-h-0 flex-1 overflow-y-auto`. A `className` with its own `max-h-*` or `overflow-*` replaces the defaults.

### Dialog.Trigger / Dialog.Close Props

Accept a `render` prop for custom element rendering (Base UI render pattern), plus standard button props.

## Controlled Usage

<!-- example: controlled -->

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

## Stacking

`Dialog` renders through a portal to the end of `body`, in the portal band (`--z-portal`). A menu, select or combobox opened inside the dialog renders above it, because it was opened later. A toast is always above the dialog. See [Styling and Theming → Z-index](../concepts/styling-theming.md#z-index).

A dialog may open on top of another dialog, or on top of a sheet. Keep to these limits:

- **Two levels at most.** The second dialog is for a confirmation or a warning only: a confirm before discarding changes, or a picker opened from a form dialog.
- **A third level is a step inside the dialog.** A screen that needs one changes the content of the second dialog instead of opening another.
- **Render the second dialog inside the first one's content.** The first dialog then knows that a dialog is open above it. `Escape` and a press outside close only the top dialog, and the dialog below stays open.
- When the second dialog closes and the first stays open, focus returns to the element that opened the second one.

The limits are a guideline. The component does not enforce them.

### Confirmation on top of a form dialog

```tsx
function EditDialog({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const close = () => {
    setConfirmOpen(false);
    setDirty(false);
    setOpen(false);
  };

  const requestClose = () => (dirty ? setConfirmOpen(true) : close());

  return (
    // Escape, the close button and a press on the scrim all arrive as `onOpenChange(false)`.
    <Dialog.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : requestClose())}>
      <Dialog.Trigger render={<Button variant="outline" />}>Edit</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Edit Item</Dialog.Title>
        </Dialog.Header>
        <div onInput={() => setDirty(true)}>
          <Input defaultValue={item.name} />
        </div>
        <Dialog.Footer>
          <Button variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button onClick={close}>Save</Button>
        </Dialog.Footer>

        {/* The second level, rendered inside the first dialog's content. */}
        <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Discard changes?</Dialog.Title>
              <Dialog.Description>The changes to this item will be lost.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close render={<Button variant="outline" />}>Keep editing</Dialog.Close>
              <Button variant="destructive" onClick={close}>
                Discard
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
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
