# Autocomplete

Text input with suggestion dropdown.

## Parts

| Part                      | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| `Autocomplete.Root`       | Root provider (accepts `items`, `value`, `onValueChange`, `filter`)     |
| `Autocomplete.InputGroup` | Container for input + trigger + clear (renders defaults if no children) |
| `Autocomplete.Input`      | Text input                                                              |
| `Autocomplete.Trigger`    | Dropdown toggle button                                                  |
| `Autocomplete.Clear`      | Clear button                                                            |
| `Autocomplete.Content`    | Dropdown popup (includes portal and positioner)                         |
| `Autocomplete.List`       | Scrollable item list                                                    |
| `Autocomplete.Item`       | Individual option                                                       |
| `Autocomplete.Empty`      | Shown when no items match                                               |
| `Autocomplete.Group`      | Groups related items                                                    |
| `Autocomplete.GroupLabel` | Label for a group                                                       |
| `Autocomplete.Value`      | Renders the selected value                                              |
| `Autocomplete.Collection` | Server-side collection renderer                                         |
| `Autocomplete.Status`     | Screen-reader status (sr-only)                                          |

## Root Props

| Prop                | Type                                     | Default  | Description                                                         |
| ------------------- | ---------------------------------------- | -------- | ------------------------------------------------------------------- |
| `items`             | `Value[]`                                | —        | Items to display in the list                                        |
| `value`             | `string`                                 | —        | Controlled input value                                              |
| `defaultValue`      | `string`                                 | —        | Initial uncontrolled input value                                    |
| `onValueChange`     | `(value: string, details) => void`       | —        | Called when input value changes                                     |
| `filter`            | `FilterFunction \| null`                 | built-in | Client-side filter. Pass `null` to disable (e.g. for async sources) |
| `mode`              | `"list" \| "both" \| "inline" \| "none"` | `"list"` | Controls filtering and inline autocompletion behavior               |
| `autoHighlight`     | `boolean \| "always"`                    | `false`  | Auto-highlight first matching item                                  |
| `openOnInputClick`  | `boolean`                                | `false`  | Open popup when clicking the input                                  |
| `itemToStringValue` | `(value: Value) => string`               | —        | Convert object values to string for display and form submission     |

## Hooks

| Hook                     | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `Autocomplete.useFilter` | Client-side filtering hook (from Base UI)      |
| `Autocomplete.useAsync`  | Async fetching with debounce and abort support |

## Example

```tsx
import { Autocomplete } from "@tailor-platform/app-shell";

const fruits = ["Apple", "Banana", "Cherry", "Date"];

<Autocomplete.Root items={fruits}>
  <Autocomplete.InputGroup />
  <Autocomplete.Content>
    <Autocomplete.List>{(item) => <Autocomplete.Item>{item}</Autocomplete.Item>}</Autocomplete.List>
    <Autocomplete.Empty>No results found.</Autocomplete.Empty>
  </Autocomplete.Content>
</Autocomplete.Root>;
```

## Async Example

```tsx
const movies = Autocomplete.useAsync({
  fetcher: async (query, { signal }) => {
    const res = await fetch(`/api/movies?q=${query}`, { signal });
    if (!res.ok) return [];
    return res.json();
  },
  debounceMs: 300,
});

<Autocomplete.Root
  items={movies.items}
  value={movies.value}
  onValueChange={movies.onValueChange}
  filter={null}
>
  <Autocomplete.InputGroup />
  <Autocomplete.Content>
    <Autocomplete.List>
      {(item) => <Autocomplete.Item>{item.title}</Autocomplete.Item>}
    </Autocomplete.List>
    <Autocomplete.Empty>{movies.loading ? "Loading..." : "No results."}</Autocomplete.Empty>
  </Autocomplete.Content>
</Autocomplete.Root>;
```
