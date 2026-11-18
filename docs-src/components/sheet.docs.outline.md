---
kind: code-backed
group: sheet
title: Sheet
description: Slide-in panel backed by a Drawer with native swipe-to-dismiss support
sources:
  - packages/core/src/components/sheet/**
---

# Sheet

The `Sheet` component is a slide-in panel that appears from any edge of the screen. It is backed by Base UI's Drawer primitive and includes native swipe-to-dismiss gesture support on touch devices.

## Import

```tsx
import { Sheet } from "@tailor-platform/app-shell";
```

The examples below also import `Button`, `Input`, and `Text` from `@tailor-platform/app-shell`.

## Basic Usage

<!-- example: basic-usage -->

## Sub-components

| Sub-component       | Description                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| `Sheet.Root`        | Manages open/close state and controls the slide direction                    |
| `Sheet.Trigger`     | Element that opens the sheet when clicked                                    |
| `Sheet.Content`     | The main sheet panel; includes close button and backdrop when `modal={true}` |
| `Sheet.Header`      | Layout wrapper for title and description                                     |
| `Sheet.Footer`      | Layout wrapper for action buttons                                            |
| `Sheet.Title`       | Sheet title (announced by screen readers)                                    |
| `Sheet.Description` | Additional context below the title                                           |
| `Sheet.Close`       | Button that closes the sheet                                                 |

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

When `modal={false}`, the sheet does not render a backdrop.

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

<!-- example: sizes -->

## Sides

<!-- example: sides -->

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

## Non-modal Sheet

<!-- example: non-modal -->

## Examples

### Header with Actions

Place action buttons (e.g., save, edit) to the right of the title using the `action` prop on `Sheet.Header`.

<!-- example: header-with-actions -->

### Filter Panel

<!-- example: filter-panel -->

### Bottom Sheet on Mobile

<!-- example: bottom-sheet -->

## Stacking

`Sheet` renders through a portal to the end of `body`, in the portal band (`--z-portal`). A modal sheet is an overlay: a scrim covers the page and page scrolling is locked. A non-modal sheet (`modal={false}`) does not block the page. A menu or select opened inside the sheet renders above it, because it was opened later. A toast is always above the sheet. See [Styling and Theming → Z-index](../concepts/styling-theming.md#z-index).

A dialog may open on top of a sheet, for example a confirmation before discarding an edit made in the sheet. The same limits apply as for a dialog on a dialog: two levels at most, the second level for a confirmation or a warning only, rendered inside the sheet content. See [Dialog → Stacking](./dialog.md#stacking).

## Accessibility

- Sheet title is announced by screen readers via `Sheet.Title`
- Focus is trapped inside the sheet while open
- Pressing `Escape` closes the sheet
- The close button is rendered inside `Sheet.Header` in the normal document flow

## Related Components

- [Dialog](./dialog.md) - Centered modal dialog for critical confirmations
- [Button](./button.md) - Use as trigger and action buttons
