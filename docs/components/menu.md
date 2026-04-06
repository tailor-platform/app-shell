---
title: Menu
description: Dropdown menu with a compound component API, supporting checkbox/radio items, groups, separators, and nested sub-menus
---

# Menu

The `Menu` component provides a dropdown menu with a compound component API. It is backed by Base UI's Menu primitive.

## Basic Usage

```tsx preview align="start"
import { Menu } from "@tailor-platform/app-shell"
;<Menu.Root>
  <Menu.Trigger>Open menu</Menu.Trigger>
  <Menu.Content>
    <Menu.Item>Edit</Menu.Item>
    <Menu.Item>Duplicate</Menu.Item>
    <Menu.Separator />
    <Menu.Item>Delete</Menu.Item>
  </Menu.Content>
</Menu.Root>
```

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

| Prop        | Type                                                                                                           | Default                                             | Description                         |
| ----------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------- |
| `position`  | `{ side?: "top" \| "right" \| "bottom" \| "left"; align?: "start" \| "center" \| "end"; sideOffset?: number }` | `{ side: "bottom", align: "start", sideOffset: 4 }` | Placement of the popup              |
| `className` | `string`                                                                                                       | -                                                   | Additional CSS classes              |
| `children`  | `React.ReactNode`                                                                                              | -                                                   | Menu items and other sub-components |

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

```tsx preview align="start" height="330"
import { Menu } from "@tailor-platform/app-shell"
;<Menu.Root>
  <Menu.Trigger>Actions</Menu.Trigger>
  <Menu.Content>
    <Menu.Group>
      <Menu.GroupLabel>File</Menu.GroupLabel>
      <Menu.Item>New</Menu.Item>
      <Menu.Item>Open</Menu.Item>
    </Menu.Group>
    <Menu.Separator />
    <Menu.Group>
      <Menu.GroupLabel>Edit</Menu.GroupLabel>
      <Menu.Item>Cut</Menu.Item>
      <Menu.Item>Copy</Menu.Item>
      <Menu.Item>Paste</Menu.Item>
    </Menu.Group>
  </Menu.Content>
</Menu.Root>
```

## Checkbox Items

```tsx
const [bold, setBold] = useState(false)
const [italic, setItalic] = useState(false)

;<Menu.Root>
  <Menu.Trigger>Format</Menu.Trigger>
  <Menu.Content>
    <Menu.CheckboxItem checked={bold} onCheckedChange={setBold}>
      <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
      Bold
    </Menu.CheckboxItem>
    <Menu.CheckboxItem checked={italic} onCheckedChange={setItalic}>
      <Menu.CheckboxItemIndicator>✓</Menu.CheckboxItemIndicator>
      Italic
    </Menu.CheckboxItem>
  </Menu.Content>
</Menu.Root>
```

## Radio Items

```tsx
const [align, setAlign] = useState("left")

;<Menu.Root>
  <Menu.Trigger>Align</Menu.Trigger>
  <Menu.Content>
    <Menu.RadioGroup value={align} onValueChange={setAlign}>
      <Menu.RadioItem value="left">
        <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
        Left
      </Menu.RadioItem>
      <Menu.RadioItem value="center">
        <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
        Center
      </Menu.RadioItem>
      <Menu.RadioItem value="right">
        <Menu.RadioItemIndicator>●</Menu.RadioItemIndicator>
        Right
      </Menu.RadioItem>
    </Menu.RadioGroup>
  </Menu.Content>
</Menu.Root>
```

## Nested Sub-menus

```tsx preview align="start" height="350"
import { Menu } from "@tailor-platform/app-shell"
;<Menu.Root>
  <Menu.Trigger>Edit</Menu.Trigger>
  <Menu.Content>
    <Menu.Item>Cut</Menu.Item>
    <Menu.Item>Copy</Menu.Item>
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger>Paste Special ›</Menu.SubmenuTrigger>
      <Menu.Content>
        <Menu.Item>Paste as Plain Text</Menu.Item>
        <Menu.Item>Paste and Match Style</Menu.Item>
      </Menu.Content>
    </Menu.SubmenuRoot>
  </Menu.Content>
</Menu.Root>
```

## Examples

### Context Menu

```tsx
function OrderActions({ order }: { order: Order }) {
  return (
    <Menu.Root>
      <Menu.Trigger>
        <Button variant="ghost" size="icon">
          <EllipsisVerticalIcon />
        </Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item onSelect={() => handleEdit(order)}>Edit</Menu.Item>
        <Menu.Item onSelect={() => handleDuplicate(order)}>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => handleDelete(order)}>Delete</Menu.Item>
      </Menu.Content>
    </Menu.Root>
  )
}
```

## Accessibility

- Menu items are keyboard navigable with arrow keys
- Pressing `Escape` closes the menu
- Sub-menus open on arrow-right and close on arrow-left
- `Menu.GroupLabel` is automatically associated with its parent group

## Related Components

- [Dialog](./dialog.md) - For actions that require confirmation
- [Sheet](./sheet.md) - Slide-in panel for more complex workflows
- [Button](./button.md) - Common trigger element for menus
