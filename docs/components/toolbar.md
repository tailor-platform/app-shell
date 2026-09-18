---
title: Toolbar
description: Full-width action bars with composable rows, grouped controls, and keyboard navigation
---

# Toolbar

`Toolbar` is a full-width action bar. It is independent of `DataTable`: place any AppShell or application control in it, including buttons, search fields, selects, comboboxes, and tabs.

```tsx
import { Toolbar } from "@tailor-platform/app-shell";

<Toolbar.Root>
  <Toolbar.Row justify="between" aria-label="Order actions">
    <Toolbar.Group>
      <Button variant="outline">Export</Button>
    </Toolbar.Group>
    <Toolbar.Group>
      <Button>New order</Button>
    </Toolbar.Group>
  </Toolbar.Row>
</Toolbar.Root>;
```

## Structure

`Toolbar.Root` stacks rows. `Toolbar.Row` is one horizontal, keyboard-navigable action row. Use `Toolbar.Group` to keep related controls together and `Toolbar.Separator` to divide groups.

```tsx
<Toolbar.Root>
  <Toolbar.Row justify="between" aria-label="Text formatting">
    <Toolbar.Group>
      <Button>Bold</Button>
      <Button>Italic</Button>
      <Toolbar.Separator />
      <Button>Copy</Button>
    </Toolbar.Group>

    <Toolbar.Group>
      <Button>Save</Button>
    </Toolbar.Group>
  </Toolbar.Row>

  <Toolbar.Row aria-label="Active filters">
    <Toolbar.Group>
      <Button variant="secondary">Status: Open</Button>
    </Toolbar.Group>
  </Toolbar.Row>
</Toolbar.Root>
```

### Row alignment

Use `justify="between"` when a row has one leading and one trailing group. The row places those outer groups at opposite edges. The default, `"start"`, keeps every group at the leading edge.

```tsx
<Toolbar.Row justify="between" aria-label="List actions">
  <Toolbar.Group>{/* search and filters */}</Toolbar.Group>
  <Toolbar.Group>{/* export and create actions */}</Toolbar.Group>
</Toolbar.Row>
```

Keep controls that belong to the leading region in the same group. `justify="between"` distributes **direct** groups, so a separator should also stay inside that group.

### Sizing fields

`Input` keeps its normal `w-full` behavior inside a toolbar. Give a field an explicit layout box when it shares a group with other controls.

```tsx
<Toolbar.Group>
  <div className="w-52">
    <Input placeholder="Search orders" />
  </div>
  <Combobox className="w-40" items={users} placeholder="Assignee" />
  <Select className="w-40" items={sortOptions} />
</Toolbar.Group>
```

## Keyboard navigation

Every row has `role="toolbar"` and supports `ArrowLeft`, `ArrowRight`, `Home`, and `End` for registered AppShell controls. Disabled controls are skipped and focus loops at either end.

AppShell `Button`, `Input`, `Select`, `Combobox`, and `Tabs.Tab` register automatically when rendered inside a row. Composite controls retain their own directional keys: arrows move the caret in an input, move between tabs, or navigate an open select/combobox. Use `Tab` to leave a composite control.

Each row should have an accessible name via `aria-label` or `aria-labelledby`.

## DataTable example

`DataTable.Filters` and `DataTable.ColumnSettings` are ordinary toolbar controls. They can be placed wherever the layout requires.

```tsx
<DataTable.Root value={table}>
  <Toolbar.Root>
    <Toolbar.Row justify="between" aria-label="Invoice table controls">
      <Toolbar.Group>
        <DataTable.Filters />
      </Toolbar.Group>
      <Toolbar.Group>
        <DataTable.ColumnSettings />
      </Toolbar.Group>
    </Toolbar.Row>
  </Toolbar.Root>
  <DataTable.Table />
</DataTable.Root>
```

When a generic toolbar is a direct child of `DataTable.Root`, DataTable retains its outer top corners and turns the toolbar border into only the divider beneath the toolbar.

## API

### `Toolbar.Root`

| Prop        | Type        | Default | Description                                      |
| ----------- | ----------- | ------- | ------------------------------------------------ |
| `children`  | `ReactNode` | —       | One or more `Toolbar.Row` elements.              |
| `className` | `string`    | —       | Additional classes for the full-width container. |

### `Toolbar.Row`

| Prop                             | Type                   | Default   | Description                                             |
| -------------------------------- | ---------------------- | --------- | ------------------------------------------------------- |
| `children`                       | `ReactNode`            | —         | Groups and separators in this horizontal row.           |
| `justify`                        | `"start" \| "between"` | `"start"` | Align direct groups at the start, or at opposite edges. |
| `aria-label` / `aria-labelledby` | `string`               | —         | Accessible name for this toolbar row.                   |
| `className`                      | `string`               | —         | Additional classes for the row.                         |

### `Toolbar.Group`

| Prop        | Type        | Default | Description                                                 |
| ----------- | ----------- | ------- | ----------------------------------------------------------- |
| `children`  | `ReactNode` | —       | Related controls arranged horizontally and allowed to wrap. |
| `className` | `string`    | —       | Additional classes for the group.                           |

### `Toolbar.Separator`

A vertical, accessible separator between related control groups. It accepts `className` for visual customization.
