---
title: Select
description: Single or multi-select dropdown with optional async data fetching
---

# Select

The `Select` component provides a fully assembled single or multi-select dropdown. Pass `items` and get a ready-to-use select out of the box. For async data fetching use `Select.Async`. For custom compositions use `Select.Parts`.

## Import

```tsx
import { Select } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Select
  items={["Apple", "Banana", "Cherry"]}
  placeholder="Pick a fruit"
  onValueChange={(value) => console.log(value)}
/>
```

## Props

### Select Props

| Prop            | Type                                                                       | Default | Description                                                         |
| --------------- | -------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| `items`         | `I[]`                                                                      | -       | Items to display. May be a flat array or an array of `ItemGroup<T>` |
| `placeholder`   | `string`                                                                   | -       | Placeholder text shown when no value is selected                    |
| `multiple`      | `true \| false \| undefined`                                               | `false` | Enables multi-select mode                                           |
| `value`         | `T \| null` (single) or `T[]` (multiple)                                   | -       | Controlled value                                                    |
| `defaultValue`  | `T \| null` (single) or `T[]` (multiple)                                   | -       | Initial value (uncontrolled)                                        |
| `onValueChange` | `(value: T \| null) => void` (single) or `(value: T[]) => void` (multiple) | -       | Called when the selected value changes                              |
| `renderValue`   | `(value: T \| null \| T[]) => React.ReactNode`                             | -       | Custom render function for the selected value display               |
| `mapItem`       | `(item: T) => MappedItem`                                                  | -       | Map each item to its label, key, and optional custom render         |
| `className`     | `string`                                                                   | -       | Additional CSS classes for the root container                       |
| `disabled`      | `boolean`                                                                  | `false` | Disables the select                                                 |

### MappedItem

```ts
interface MappedItem {
  label: string; // Display text, used for filtering and a11y
  key?: string; // React key. Defaults to label
  render?: React.ReactNode; // Custom JSX to render in the dropdown
}
```

### ItemGroup

Pass grouped items by wrapping them in `ItemGroup<T>` objects:

```ts
interface ItemGroup<T> {
  label: string;
  items: T[];
}
```

## Grouped Items

```tsx
const fruits = [
  { label: "Citrus", items: ["Orange", "Lemon", "Lime"] },
  { label: "Berries", items: ["Strawberry", "Blueberry"] },
];

<Select items={fruits} placeholder="Pick a fruit" />;
```

## Object Items with mapItem

When items are objects, use `mapItem` to tell the component how to display them:

```tsx
type Fruit = { id: number; name: string };

const fruits: Fruit[] = [
  { id: 1, name: "Apple" },
  { id: 2, name: "Banana" },
];

<Select
  items={fruits}
  mapItem={(fruit) => ({ label: fruit.name, key: String(fruit.id) })}
  onValueChange={(fruit) => console.log(fruit?.id)}
/>;
```

## Multi-select

```tsx
<Select
  items={["Red", "Green", "Blue"]}
  multiple
  placeholder="Pick colors"
  onValueChange={(colors) => console.log(colors)}
/>
```

## Async Loading

Use `Select.Async` to load items from an API. The fetcher is called each time the dropdown is opened.

```tsx
import { type SelectAsyncFetcher } from "@tailor-platform/app-shell";

const fetcher: SelectAsyncFetcher<Fruit> = async ({ signal }) => {
  const res = await fetch("/api/fruits", { signal });
  return res.json();
};

<Select.Async
  fetcher={fetcher}
  mapItem={(fruit) => ({ label: fruit.name, key: String(fruit.id) })}
  placeholder="Pick a fruit"
  onValueChange={(fruit) => console.log(fruit)}
/>;
```

### Select.Async Props

Accepts all the same props as `Select` except `items`, plus:

| Prop          | Type                    | Default        | Description                                     |
| ------------- | ----------------------- | -------------- | ----------------------------------------------- |
| `fetcher`     | `SelectAsyncFetcher<T>` | -              | Fetcher called each time the dropdown is opened |
| `loadingText` | `string`                | `"Loading..."` | Text shown while loading                        |

> **Note:** `Select.Async` does not support `ItemGroup<T>[]` — the fetcher must return a flat array.

### SelectAsyncFetcher

```ts
type SelectAsyncFetcher<T> = (options: { signal: AbortSignal }) => Promise<T[]>;
```

Errors thrown by the fetcher are silently caught — handle errors inside the fetcher (e.g. show a toast, return fallback data).

## Low-level Primitives

`Select.Parts` exposes the styled sub-components for fully custom compositions:

```tsx
const { Root, Trigger, Value, Content, Item, Group, GroupLabel, Separator } = Select.Parts;
```

## Examples

### Controlled Select

```tsx
const [selected, setSelected] = useState<string | null>(null);

<Select
  items={["Draft", "Pending", "Approved", "Rejected"]}
  value={selected}
  onValueChange={setSelected}
  placeholder="Select status"
/>;
```

### Custom Render

```tsx
<Select
  items={statuses}
  mapItem={(s) => ({
    label: s.name,
    key: s.id,
    render: (
      <span className="flex items-center gap-2">
        <span className={`size-2 rounded-full bg-${s.color}`} />
        {s.name}
      </span>
    ),
  })}
  placeholder="Select status"
/>
```

## Related Components

- [Combobox](./combobox.md) - Searchable combobox with filtering
- [Autocomplete](./autocomplete.md) - Free-text input with suggestions
