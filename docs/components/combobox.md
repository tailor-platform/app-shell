---
title: Combobox
description: Searchable combobox with single/multi selection, built-in filtering, async data fetching, and user-creatable items
---

# Combobox

The `Combobox` component provides a searchable combobox with built-in filtering. Pass `items` and get a ready-to-use combobox out of the box. For async data fetching use `Combobox.Async`. For user-created items add an `onCreateItem` prop. For custom compositions use `Combobox.Parts`.

## Import

```tsx
import { Combobox } from "@tailor-platform/app-shell"
```

## Basic Usage

```tsx preview align="start"
import { Combobox } from "@tailor-platform/app-shell"
;<Combobox
  items={["Apple", "Banana", "Cherry"]}
  placeholder="Search fruits..."
  onValueChange={(value) => console.log(value)}
/>
```

## Props

### Combobox Props

| Prop                | Type                                                                       | Default                      | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `items`             | `I[]`                                                                      | -                            | Items to display. May be a flat array or an array of `ItemGroup<T>`        |
| `placeholder`       | `string`                                                                   | -                            | Placeholder text for the input                                             |
| `emptyText`         | `string`                                                                   | `"No results."`              | Text shown when no items match                                             |
| `multiple`          | `true \| false \| undefined`                                               | `false`                      | Enables multi-select mode                                                  |
| `value`             | `T \| null` (single) or `T[]` (multiple)                                   | -                            | Controlled value                                                           |
| `defaultValue`      | `T \| null` (single) or `T[]` (multiple)                                   | -                            | Initial value (uncontrolled)                                               |
| `onValueChange`     | `(value: T \| null) => void` (single) or `(value: T[]) => void` (multiple) | -                            | Called when the selected value changes                                     |
| `mapItem`           | `(item: T) => MappedItem`                                                  | -                            | Map each item to its label, key, and optional custom render                |
| `className`         | `string`                                                                   | -                            | Additional CSS classes for the root container                              |
| `disabled`          | `boolean`                                                                  | `false`                      | Disables the combobox                                                      |
| `onCreateItem`      | `(value: string) => T \| false \| Promise<T \| false>`                     | -                            | Enable user-created items (requires `mapItem`; `T` must be an object type) |
| `formatCreateLabel` | `(value: string) => string`                                                | `` (v) => `Create "${v}"` `` | Format the label for the "create" option                                   |

### MappedItem

```ts
interface MappedItem {
  label: string // Display text, used for filtering and a11y
  key?: string // React key. Defaults to label
  render?: React.ReactNode // Custom JSX to render in the dropdown
}
```

### ItemGroup

```ts
interface ItemGroup<T> {
  label: string
  items: T[]
}
```

## Grouped Items

```tsx preview align="start" height="350"
import { Combobox } from "@tailor-platform/app-shell"
;<Combobox
  placeholder="Search fruits..."
  items={[
    { label: "Citrus", items: ["Orange", "Lemon", "Lime"] },
    { label: "Berries", items: ["Strawberry", "Blueberry"] },
  ]}
/>
```

## Multi-select

In multi-select mode, selected items are displayed as chips inside the input:

```tsx preview align="start"
import { Combobox } from "@tailor-platform/app-shell"
;<Combobox
  items={["Red", "Green", "Blue"]}
  multiple
  placeholder="Pick colors"
  onValueChange={(colors) => console.log(colors)}
/>
```

## Creatable Items

Add `onCreateItem` to let users create new items on-the-fly. `T` must be an object type:

```tsx
type Tag = { id: string; name: string }

const [tags, setTags] = useState<Tag[]>([
  { id: "1", name: "Bug" },
  { id: "2", name: "Feature" },
])

;<Combobox
  items={tags}
  mapItem={(tag) => ({ label: tag.name, key: tag.id })}
  onCreateItem={(value) => {
    const newTag: Tag = { id: crypto.randomUUID(), name: value }
    setTags((prev) => [...prev, newTag])
    return newTag // return the new item to add it to the selection
  }}
  placeholder="Search or create a tag..."
/>
```

`onCreateItem` may return:

- `T` — accept the item and add it to the selection
- `false` — cancel the creation
- `Promise<T | false>` — for async workflows

## Async Loading

Use `Combobox.Async` to load items from an API. The fetcher is called on each keystroke (debounced). When the dropdown first opens or the input is cleared, the fetcher receives `null` as the query — return initial/default items for `null`, or return an empty array to show nothing until the user starts typing.

```tsx
import { type ComboboxAsyncFetcher } from "@tailor-platform/app-shell"

const fetcher: ComboboxAsyncFetcher<User> = async (query, { signal }) => {
  const res = await fetch(`/api/users?q=${query ?? ""}`, { signal })
  return res.json()
}

;<Combobox.Async
  fetcher={fetcher}
  mapItem={(user) => ({ label: user.name, key: user.id })}
  placeholder="Search users..."
  onValueChange={(user) => console.log(user)}
/>
```

`Combobox.Async` also supports `onCreateItem` for creatable async comboboxes.

### Combobox.Async Props

Accepts all the same props as `Combobox` except `items`, plus:

| Prop          | Type                      | Default        | Description                                             |
| ------------- | ------------------------- | -------------- | ------------------------------------------------------- |
| `fetcher`     | `ComboboxAsyncFetcher<T>` | -              | Fetcher called on each keystroke (debounced by default) |
| `loadingText` | `string`                  | `"Loading..."` | Text shown while loading                                |

### ComboboxAsyncFetcher

```ts
type ComboboxAsyncFetcher<T> =
  | ((query: string | null, options: { signal: AbortSignal }) => Promise<T[]>)
  | {
      fn: (query: string | null, options: { signal: AbortSignal }) => Promise<T[]>
      debounceMs: number
    }
```

`query` is `null` when the user has not typed anything (e.g. the dropdown was just opened or the input was cleared). Pass `{ fn, debounceMs }` to customize the debounce delay. Errors thrown by the fetcher are silently caught — handle errors inside the fetcher.

## Low-level Primitives

`Combobox.Parts` exposes styled sub-components and hooks for fully custom compositions:

```tsx
const {
  Root,
  InputGroup,
  Input,
  Trigger,
  Content,
  List,
  Item,
  Empty,
  Group,
  GroupLabel,
  Clear,
  Chips,
  Chip,
  ChipRemove,
  Value,
  Collection,
  Status,
  useFilter,
  useCreatable,
  useAsync,
} = Combobox.Parts
```

## Examples

### Controlled Combobox

```tsx
const [selected, setSelected] = useState<User | null>(null)

;<Combobox
  items={users}
  mapItem={(u) => ({ label: u.name, key: u.id })}
  value={selected}
  onValueChange={setSelected}
  placeholder="Select a user"
/>
```

## Accessibility

- Input is keyboard accessible with arrow key navigation
- Pressing `Escape` closes the dropdown
- Multi-select chips have `aria-label` set from the item label

## Related Components

- [Select](./select.md) - Non-searchable dropdown
- [Autocomplete](./autocomplete.md) - Free-text input with suggestions
