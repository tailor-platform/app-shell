---
title: Sheet
description: Slide-in panel backed by a Drawer with native swipe-to-dismiss support
---

# Sheet

The `Sheet` component is a slide-in panel that appears from any edge of the screen. It is backed by Base UI's Drawer primitive and includes native swipe-to-dismiss gesture support on touch devices.

## Import

```tsx
import { Sheet } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Sheet.Root side="right">
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

| Prop        | Type                                     | Default | Description                                                     |
| ----------- | ---------------------------------------- | ------- | --------------------------------------------------------------- |
| `size`      | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"sm"`  | Max-width of the sheet panel (applies to left/right sides only) |
| `className` | `string`                                 | -       | Additional CSS classes                                          |

Also accepts all standard HTML `<div>` props.

### Sheet.Header Props

| Prop     | Type              | Default | Description                                             |
| -------- | ----------------- | ------- | ------------------------------------------------------- |
| `action` | `React.ReactNode` | -       | Action buttons displayed to the right of the title area |

The header renders a close button on the left, title in the center, and action buttons on the right.

### Sheet.Trigger / Sheet.Close Props

Accept a `render` prop for custom element rendering (Base UI render pattern), plus standard button props.

## Sizes

Control the width of the sheet panel using the `size` prop on `Sheet.Content`. This applies to `left` and `right` side sheets.

```tsx
<Sheet.Root side="right">
  <Sheet.Trigger render={<Button />}>Open Small</Sheet.Trigger>
  <Sheet.Content size="sm">…</Sheet.Content>  {/* 384px (24rem) — default */}
</Sheet.Root>

<Sheet.Root side="right">
  <Sheet.Trigger render={<Button />}>Open Medium</Sheet.Trigger>
  <Sheet.Content size="md">…</Sheet.Content>  {/* 512px (32rem) */}
</Sheet.Root>

<Sheet.Root side="right">
  <Sheet.Trigger render={<Button />}>Open Large</Sheet.Trigger>
  <Sheet.Content size="lg">…</Sheet.Content>  {/* 720px (45rem) */}
</Sheet.Root>

<Sheet.Root side="right">
  <Sheet.Trigger render={<Button />}>Open XL</Sheet.Trigger>
  <Sheet.Content size="xl">…</Sheet.Content>  {/* 960px (60rem) */}
</Sheet.Root>

<Sheet.Root side="right">
  <Sheet.Trigger render={<Button />}>Open Full</Sheet.Trigger>
  <Sheet.Content size="full">…</Sheet.Content>  {/* 100% width */}
</Sheet.Root>
```

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
const [open, setOpen] = useState(false);

<Sheet.Root side="right" open={open} onOpenChange={setOpen}>
  <Sheet.Trigger render={<Button />}>Open</Sheet.Trigger>
  <Sheet.Content>
    <Sheet.Header>
      <Sheet.Title>Filters</Sheet.Title>
    </Sheet.Header>
    <Sheet.Footer>
      <Button onClick={() => setOpen(false)}>Apply</Button>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>;
```

## Examples

### Header with Actions

Place action buttons (e.g., save, edit) to the right of the title using the `action` prop on `Sheet.Header`.

```tsx
<Sheet.Root side="right">
  <Sheet.Trigger render={<Button />}>Edit Record</Sheet.Trigger>
  <Sheet.Content size="lg">
    <Sheet.Header action={<Button size="sm">Save</Button>}>
      <Sheet.Title>Edit Customer</Sheet.Title>
    </Sheet.Header>
    <div className="astw:p-4">
      <Input placeholder="Customer name" />
    </div>
  </Sheet.Content>
</Sheet.Root>
```

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
  );
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
- The close button is rendered inside `Sheet.Header` in the normal document flow

## Related Components

- [Dialog](./dialog.md) - Centered modal dialog for critical confirmations
- [Button](./button.md) - Use as trigger and action buttons
