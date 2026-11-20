---
kind: code-backed
group: menu
title: Menu
description: Dropdown menu with a compound component API, supporting checkbox/radio items, groups, separators, and nested sub-menus
sources:
  - packages/core/src/components/menu/**
  - packages/core/src/lib/position.ts
---

# Menu

The `Menu` component provides a dropdown menu with a compound component API. It is backed by Base UI's Menu primitive.

## Import

```tsx
import { Menu } from "@tailor-platform/app-shell";
```

The runnable examples also import `useState` from `react`, `Button` and `Text` from `@tailor-platform/app-shell`, and `EllipsisVerticalIcon` from `lucide-react`.

## Basic Usage

<!-- example: basic-usage -->

## Sub-components

| Sub-component                | Description                                               |
| ---------------------------- | --------------------------------------------------------- |
| `Menu.Root`                  | Manages menu open/close state                             |
| `Menu.Trigger`               | Element that opens the menu when clicked                  |
| `Menu.Content`               | The menu popup containing menu items                      |
| `Menu.Item`                  | An individual interactive item                            |
| `Menu.LinkItem`              | A link item for navigation                                |
| `Menu.CheckboxItem`          | A menu item that toggles a setting on or off              |
| `Menu.CheckboxItemIndicator` | Indicates whether the checkbox item is ticked             |
| `Menu.RadioItem`             | A menu item that works like a radio button within a group |
| `Menu.RadioItemIndicator`    | Indicates whether the radio item is selected              |
| `Menu.RadioGroup`            | Groups related radio items                                |
| `Menu.Group`                 | Groups related menu items                                 |
| `Menu.GroupLabel`            | An accessible label for a `Menu.Group`                    |
| `Menu.Separator`             | A visual separator between menu items                     |
| `Menu.SubmenuRoot`           | Groups all parts of a nested sub-menu                     |
| `Menu.SubmenuTrigger`        | A menu item that opens a sub-menu                         |

## Props

### Menu.Root Props

| Prop           | Type                      | Default | Description                       |
| -------------- | ------------------------- | ------- | --------------------------------- |
| `open`         | `boolean`                 | -       | Controlled open state             |
| `defaultOpen`  | `boolean`                 | `false` | Initial open state (uncontrolled) |
| `onOpenChange` | `(open: boolean) => void` | -       | Callback when open state changes  |
| `modal`        | `boolean`                 | `true`  | Whether the menu is modal         |
| `disabled`     | `boolean`                 | `false` | Disables the entire menu          |
| `children`     | `React.ReactNode`         | -       | Menu sub-components               |

### Menu.Content Props

| Prop        | Type              | Default                                             | Description                         |
| ----------- | ----------------- | --------------------------------------------------- | ----------------------------------- |
| `position`  | `PositionProps`   | `{ side: "bottom", align: "start", sideOffset: 4 }` | Placement of the popup              |
| `className` | `string`          | -                                                   | Additional CSS classes              |
| `children`  | `React.ReactNode` | -                                                   | Menu items and other sub-components |

### PositionProps

The public `PositionProps` type is shared by the `position` prop on `Menu.Content` and [`Tooltip.Content`](./tooltip.md#tooltipcontent-props). Import it from `@tailor-platform/app-shell` when reusing a placement configuration.

| Property     | Type                                     | Description                          |
| ------------ | ---------------------------------------- | ------------------------------------ |
| `side`       | `"top" \| "right" \| "bottom" \| "left"` | Preferred side of the trigger.       |
| `align`      | `"start" \| "center" \| "end"`           | Alignment along the cross axis.      |
| `sideOffset` | `number`                                 | Distance in pixels from the trigger. |

All properties are optional. Defaults belong to the component: Menu uses bottom/start/4px, while Tooltip uses top/center/5px.

### Menu.Item Props

Accepts `className`, `disabled`, and all standard Base UI `Menu.Item` props.

### Menu.SubmenuRoot Props

| Prop           | Type                      | Default | Description                       |
| -------------- | ------------------------- | ------- | --------------------------------- |
| `open`         | `boolean`                 | -       | Controlled open state             |
| `defaultOpen`  | `boolean`                 | `false` | Initial open state (uncontrolled) |
| `onOpenChange` | `(open: boolean) => void` | -       | Callback when open state changes  |
| `disabled`     | `boolean`                 | `false` | Disables the entire sub-menu      |
| `children`     | `React.ReactNode`         | -       | Sub-menu sub-components           |

## Grouped Items

Use `Menu.Group` and `Menu.GroupLabel` to visually group related items:

<!-- example: grouped-items -->

## Checkbox Items

Open **Format text** and toggle Bold or Italic. The sample text and the reported settings update together.

<!-- example: checkbox-items -->

## Radio Items

Choose an alignment from **Align text**. Only one radio item is selected, and the sample text moves to that alignment.

<!-- example: radio-items -->

## Nested Sub-menus

<!-- example: nested-submenus -->

## Examples

### Row Actions Menu

Open the order's three-dot button and choose an action. This is a button-triggered dropdown, not a right-click context menu. The example records the chosen action locally without modifying an order or navigating away. Use `render` to make the styled `Button` the trigger itself, rather than nesting two buttons.

<!-- example: row-actions -->

## Accessibility

- Menu items are keyboard navigable with arrow keys
- Pressing `Escape` closes the menu
- Sub-menus open on arrow-right and close on arrow-left
- `Menu.GroupLabel` is automatically associated with its parent group

## Related Components

- [Dialog](./dialog.md) - For actions that require confirmation
- [Sheet](./sheet.md) - Slide-in panel for more complex workflows
- [Button](./button.md) - Common trigger element for menus
