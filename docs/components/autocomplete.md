---
title: Autocomplete
description: Text input with a suggestion list — value is the raw input string, not a discrete item selection
---

# Autocomplete

The `Autocomplete` component provides a free-text input with a suggestion list. Unlike `Select` and `Combobox`, the component value is the raw input string — not a discrete item selection. For async suggestions use `Autocomplete.Async`. For custom compositions use `Autocomplete.Parts`.

## Import

```tsx
import { Autocomplete } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Autocomplete
  items={["Apple", "Banana", "Cherry"]}
  placeholder="Type a fruit..."
  onValueChange={(value) => console.log(value)}
/>
```

## Props

### Autocomplete Props

| Prop            | Type                      | Default         | Description                                                         |
| --------------- | ------------------------- | --------------- | ------------------------------------------------------------------- |
| `items`         | `I[]`                     | -               | Suggestion items. May be a flat array or an array of `ItemGroup<T>` |
| `placeholder`   | `string`                  | -               | Placeholder text for the input                                      |
| `emptyText`     | `string`                  | `"No results."` | Text shown when no items match                                      |
| `value`         | `string`                  | -               | Controlled value (raw input string)                                 |
| `defaultValue`  | `string`                  | -               | Initial value (uncontrolled)                                        |
| `onValueChange` | `(value: string) => void` | -               | Called when the value changes                                       |
| `mapItem`       | `(item: T) => MappedItem` | -               | Map each item to its label, key, and optional custom render         |
| `className`     | `string`                  | -               | Additional CSS classes for the root container                       |
| `disabled`      | `boolean`                 | `false`         | Disables the autocomplete                                           |

### MappedItem

```ts
interface MappedItem {
  label: string; // Display text, used for filtering and a11y
  key?: string; // React key. Defaults to label
  render?: React.ReactNode; // Custom JSX to render in the dropdown
}
```

### ItemGroup

```ts
interface ItemGroup<T> {
  label: string;
  items: T[];
}
```

## Grouped Suggestions

```tsx
const cities = [
  { label: "Japan", items: ["Tokyo", "Osaka", "Kyoto"] },
  { label: "France", items: ["Paris", "Lyon", "Marseille"] },
];

<Autocomplete items={cities} placeholder="Search cities..." />;
```

## Object Items with mapItem

When items are objects, use `mapItem` to tell the component how to display them. The selected value is the item's `label` string returned by `mapItem`:

```tsx
type City = { code: string; name: string };

const cities: City[] = [
  { code: "TYO", name: "Tokyo" },
  { code: "OSA", name: "Osaka" },
];

<Autocomplete
  items={cities}
  mapItem={(city) => ({ label: city.name, key: city.code })}
  placeholder="Search cities..."
  onValueChange={(name) => console.log(name)} // receives "Tokyo", "Osaka", etc.
/>;
```

## Async Suggestions

Use `Autocomplete.Async` to fetch suggestions as the user types. The fetcher is called on each keystroke (debounced).

```tsx
import { type AutocompleteAsyncFetcher } from "@tailor-platform/app-shell";

const fetcher: AutocompleteAsyncFetcher<string> = async ({ query, signal }) => {
  const res = await fetch(`/api/suggestions?q=${query}`, { signal });
  return res.json();
};

<Autocomplete.Async
  fetcher={fetcher}
  placeholder="Search..."
  onValueChange={(value) => console.log(value)}
/>;
```

### Autocomplete.Async Props

Accepts all the same props as `Autocomplete` except `items`, plus:

| Prop          | Type                          | Default        | Description                                             |
| ------------- | ----------------------------- | -------------- | ------------------------------------------------------- |
| `fetcher`     | `AutocompleteAsyncFetcher<T>` | -              | Fetcher called on each keystroke (debounced by default) |
| `loadingText` | `string`                      | `"Loading..."` | Text shown while loading                                |

### AutocompleteAsyncFetcher

```ts
type AutocompleteAsyncFetcher<T> =
  | ((options: { query: string; signal: AbortSignal }) => Promise<T[]>)
  | { fn: (options: { query: string; signal: AbortSignal }) => Promise<T[]>; debounceMs: number };
```

Pass `{ fn, debounceMs }` to customize the debounce delay. Errors thrown by the fetcher are silently caught — handle errors inside the fetcher.

## Low-level Primitives

`Autocomplete.Parts` exposes styled sub-components and hooks for fully custom compositions:

```tsx
const {
  Root,
  Value,
  InputGroup,
  Input,
  Trigger,
  Content,
  List,
  Item,
  Empty,
  Clear,
  Group,
  GroupLabel,
  Collection,
  Status,
  useFilter,
  useAsync,
} = Autocomplete.Parts;
```

## Examples

### Controlled Autocomplete

```tsx
const [query, setQuery] = useState("");

<Autocomplete items={suggestions} value={query} onValueChange={setQuery} placeholder="Search..." />;
```

### Address Input with Async Suggestions

```tsx
const fetcher: AutocompleteAsyncFetcher<string> = async ({ query, signal }) => {
  if (!query) return [];
  const res = await fetch(`/api/address-lookup?q=${encodeURIComponent(query)}`, { signal });
  return res.json();
};

<Autocomplete.Async
  fetcher={fetcher}
  placeholder="Start typing an address..."
  onValueChange={(address) => form.setValue("address", address)}
/>;
```

## Accessibility

- Input is keyboard accessible with arrow key navigation
- Pressing `Escape` closes the suggestion list
- Selecting a suggestion fills the input with the item's label

## Related Components

- [Select](./select.md) - Non-searchable discrete item selection
- [Combobox](./combobox.md) - Searchable combobox that returns discrete items
- [Input](./input.md) - Plain text input without suggestions
