---
title: Sheet
description: Slide-in panel backed by a Drawer with native swipe-to-dismiss support
---

# Sheet

The `Sheet` component is a slide-in panel that appears from any edge of the screen. It is backed by Base UI's Drawer primitive and includes native swipe-to-dismiss gesture support on touch devices.

## Import

```tsx
import { Sheet } from "@tailor-platform/app-shell"
```

## Basic Usage

```tsx preview height="500"
import { Button, Sheet } from "@tailor-platform/app-shell"
;<Sheet.Root side="right">
  <Sheet.Trigger render={<Button />}>Open Settings</Sheet.Trigger>
  <Sheet.Content>
    <Sheet.Header>
      <Sheet.Title>Settings</Sheet.Title>
      <Sheet.Description>Manage your preferences.</Sheet.Description>
    </Sheet.Header>
    {/* Sheet body content */}
    <Sheet.Footer>
      <Sheet.Close render={<Button variant="outline" />}>Close</Sheet.Close>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
```

## Sub-components

| Sub-component       | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `Sheet.Root`        | Manages open/close state and controls the slide direction              |
| `Sheet.Trigger`     | Element that opens the sheet when clicked                              |
| `Sheet.Content`     | The main sheet panel (includes overlay and close button automatically) |
| `Sheet.Header`      | Layout wrapper for title and description                               |
| `Sheet.Footer`      | Layout wrapper for action buttons                                      |
| `Sheet.Title`       | Sheet title (announced by screen readers)                              |
| `Sheet.Description` | Additional context below the title                                     |
| `Sheet.Close`       | Button that closes the sheet                                           |

## Props

### Sheet.Root Props

| Prop           | Type                                     | Default   | Description                                       |
| -------------- | ---------------------------------------- | --------- | ------------------------------------------------- |
| `side`         | `"top" \| "right" \| "bottom" \| "left"` | `"right"` | Which edge of the screen the sheet slides in from |
| `open`         | `boolean`                                | -         | Controlled open state                             |
| `defaultOpen`  | `boolean`                                | `false`   | Initial open state (uncontrolled)                 |
| `onOpenChange` | `(open: boolean) => void`                | -         | Callback when open state changes                  |
| `modal`        | `boolean`                                | `true`    | Whether the sheet is modal                        |
| `children`     | `React.ReactNode`                        | -         | Sheet sub-components                              |

### Sheet.Content Props

Accepts `className` and all standard HTML `<div>` props.

### Sheet.Trigger / Sheet.Close Props

Accept a `render` prop for custom element rendering (Base UI render pattern), plus standard button props.

## Sides

```tsx
<Sheet.Root side="right">…</Sheet.Root>   {/* default — slides from right */}
<Sheet.Root side="left">…</Sheet.Root>    {/* slides from left */}
<Sheet.Root side="top">…</Sheet.Root>     {/* slides from top */}
<Sheet.Root side="bottom">…</Sheet.Root>  {/* slides from bottom */}
```

The swipe-to-dismiss gesture direction is automatically determined by the `side` prop.

## Controlled Usage

```tsx
const [open, setOpen] = useState(false)

;<Sheet.Root side="right" open={open} onOpenChange={setOpen}>
  <Sheet.Trigger render={<Button />}>Open</Sheet.Trigger>
  <Sheet.Content>
    <Sheet.Header>
      <Sheet.Title>Filters</Sheet.Title>
    </Sheet.Header>
    <Sheet.Footer>
      <Button onClick={() => setOpen(false)}>Apply</Button>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
```

## Examples

### Filter Panel

```tsx
function FilterPanel() {
  return (
    <Sheet.Root side="right">
      <Sheet.Trigger render={<Button variant="outline" />}>Filters</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title>Filter Orders</Sheet.Title>
          <Sheet.Description>Narrow down orders by criteria.</Sheet.Description>
        </Sheet.Header>
        <div className="astw:p-4 astw:flex astw:flex-col astw:gap-4">
          <Input placeholder="Customer name" />
          <Input placeholder="Order number" />
        </div>
        <Sheet.Footer>
          <Sheet.Close render={<Button variant="outline" />}>Clear</Sheet.Close>
          <Button>Apply Filters</Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  )
}
```

### Bottom Sheet on Mobile

```tsx
<Sheet.Root side="bottom">
  <Sheet.Trigger render={<Button />}>More Options</Sheet.Trigger>
  <Sheet.Content>
    <Sheet.Header>
      <Sheet.Title>Actions</Sheet.Title>
    </Sheet.Header>
    <div className="astw:p-4 astw:flex astw:flex-col astw:gap-2">
      <Button variant="ghost" className="astw:justify-start">
        Edit
      </Button>
      <Button variant="ghost" className="astw:justify-start">
        Duplicate
      </Button>
      <Button variant="ghost" className="astw:justify-start astw:text-destructive">
        Delete
      </Button>
    </div>
  </Sheet.Content>
</Sheet.Root>
```

## Accessibility

- Sheet title is announced by screen readers via `Sheet.Title`
- Focus is trapped inside the sheet while open
- Pressing `Escape` closes the sheet
- The close button is always present inside `Sheet.Content`

## Related Components

- [Dialog](./dialog.md) - Centered modal dialog for critical confirmations
- [Button](./button.md) - Use as trigger and action buttons
