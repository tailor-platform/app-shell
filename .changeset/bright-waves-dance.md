---
"@tailor-platform/app-shell": minor
---

Add `Menu`, `Select`, `Combobox`, and `Autocomplete` components.

## New components

```tsx
import { Menu, Select, Combobox, Autocomplete } from "@tailor-platform/app-shell";
```

### Menu

Dropdown menu with compound component API (`Menu.Root`, `Menu.Trigger`, `Menu.Content`, `Menu.Item`, etc.). Supports checkbox/radio items, grouped items, separators, and nested sub-menus via `Menu.SubmenuRoot` / `Menu.SubmenuTrigger`.

```tsx
<Menu.Root>
  <Menu.Trigger>Open menu</Menu.Trigger>
  <Menu.Content>
    <Menu.Item>Edit</Menu.Item>
    <Menu.Item>Duplicate</Menu.Item>
    <Menu.Separator />
    <Menu.Item>Delete</Menu.Item>
  </Menu.Content>
</Menu.Root>
```

### Select

Single or multi-select dropdown. Pass `items` and get a fully assembled select out of the box. Also supports async data fetching via `Select.Async`.

```tsx
<Select
  items={["Apple", "Banana", "Cherry"]}
  placeholder="Pick a fruit"
  onValueChange={(value) => console.log(value)}
/>
```

### Combobox

Searchable combobox with single/multi selection. Pass `items` and get a fully assembled combobox with built-in filtering. Supports async data fetching via `Combobox.Async` and user-created items via `onCreateItem` prop.

```tsx
<Combobox
  items={["Apple", "Banana", "Cherry"]}
  placeholder="Search fruits..."
  onValueChange={(value) => console.log(value)}
/>
```

### Autocomplete

Text input with a suggestion list. The value is the raw input string, not a discrete item selection. Also supports async suggestions via `Autocomplete.Async`.

```tsx
<Autocomplete
  items={["Apple", "Banana", "Cherry"]}
  placeholder="Type a fruit..."
  onValueChange={(value) => console.log(value)}
/>
```

### Low-level primitives via `.Parts`

`Select`, `Combobox`, and `Autocomplete` each expose a `.Parts` namespace containing the styled low-level sub-components (e.g. `Root`, `Input`, `Content`, `Item`, `List`, etc.) and hooks (`useFilter`, `useAsync`, `useCreatable`) for building fully custom compositions when the ready-made component doesn't fit your needs.

```tsx
const { Root, Trigger, Content, Item } = Select.Parts;
```
