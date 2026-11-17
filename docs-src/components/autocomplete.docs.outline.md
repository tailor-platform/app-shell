---
kind: code-backed
group: autocomplete
title: Autocomplete
description: Text input with a suggestion list — value is the raw input string, not a discrete item selection
sources:
  - packages/core/src/components/autocomplete/**
---

# Autocomplete

The `Autocomplete` component provides a free-text input with a suggestion list. Unlike `Select` and `Combobox`, the component value is the raw input string — not a discrete item selection. For async suggestions use `Autocomplete.Async`. For custom compositions use `Autocomplete.Parts`.

## Import

```tsx
import { Autocomplete } from "@tailor-platform/app-shell";
```

The runnable examples also import `useRef` and `useState` from `react`, and `Button`, `Field`, `Form`, `Text`, and the `AutocompleteAsyncFetcher` type from `@tailor-platform/app-shell`.

## Basic Usage

<!-- example: basic-usage -->

## Props

### Autocomplete Props

| Prop              | Type                      | Default         | Description                                                         |
| ----------------- | ------------------------- | --------------- | ------------------------------------------------------------------- |
| `items`           | `I[]`                     | -               | Suggestion items. May be a flat array or an array of `ItemGroup<T>` |
| `placeholder`     | `string`                  | -               | Placeholder text for the input                                      |
| `emptyText`       | `string`                  | `"No results."` | Text shown when no items match                                      |
| `value`           | `string`                  | -               | Controlled value (raw input string)                                 |
| `defaultValue`    | `string`                  | -               | Initial value (uncontrolled)                                        |
| `onValueChange`   | `(value: string) => void` | -               | Called when the value changes                                       |
| `mapItem`         | `(item: T) => MappedItem` | -               | Map each item to its label, key, and optional custom render         |
| `className`       | `string`                  | -               | Additional CSS classes for the root container                       |
| `disabled`        | `boolean`                 | `false`         | Disables the autocomplete                                           |
| `aria-label`      | `string`                  | -               | Accessible name for the input. Use when there is no visible label   |
| `aria-labelledby` | `string`                  | -               | ID of the element(s) that label the input                           |
| `id`              | `string`                  | -               | ID applied to the combobox input element                            |

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

<!-- example: grouped-suggestions -->

## Object Items with mapItem

When items are objects, use `mapItem` to tell the component how to display them. The selected value is the item's `label` string returned by `mapItem`:

<!-- example: object-items -->

## Async Suggestions

Use `Autocomplete.Async` to fetch suggestions as the user types. The fetcher is called on each keystroke (debounced). When the dropdown first opens or the input is cleared, the fetcher receives `null` as the query — return initial/default suggestions for `null`, or return an empty array to show nothing until the user starts typing.

Type **ap** or **ba** to try debounced lookups, a short loading state, and suggestion selection. The example filters local fixtures after a delay and checks the supplied `AbortSignal`; no network request is made. Its value remains the input text, including text that does not match a suggestion. In an application, replace the fixture lookup with your API and forward `signal` to `fetch`.

<!-- example: async-suggestions -->

### Autocomplete.Async Props

Accepts all the same props as `Autocomplete` except `items`, plus:

| Prop           | Type                          | Default                    | Description                                                        |
| -------------- | ----------------------------- | -------------------------- | ------------------------------------------------------------------ |
| `fetcher`      | `AutocompleteAsyncFetcher<T>` | -                          | Fetcher called on each keystroke (debounced by default)            |
| `loadingText`  | `string`                      | `"Loading..."`             | Text shown while loading                                           |
| `errorText`    | `string`                      | `"Couldn't load results."` | Message shown in the popover when the fetcher fails (with Retry)   |
| `retryText`    | `string`                      | `"Retry"`                  | Label for the retry button in the error state                      |
| `onFetchError` | `(error: unknown) => void`    | -                          | Called once per outage when a fetch fails (logging/error tracking) |

### AutocompleteAsyncFetcher

```ts
type AutocompleteAsyncFetcher<T> =
  | ((query: string | null, options: { signal: AbortSignal }) => Promise<T[]>)
  | {
      fn: (query: string | null, options: { signal: AbortSignal }) => Promise<T[]>;
      debounceMs: number;
    };
```

`query` is `null` when the user has not typed anything (e.g. the dropdown was just opened or the input was cleared). Pass `{ fn, debounceMs }` to customize the debounce delay.

### Error handling

If the fetcher throws or rejects, `Autocomplete.Async` renders a built-in inline error state in the popover — the `errorText` message plus a **Retry** button that re-runs the last fetch — instead of the misleading "No results." empty state. Aborted/superseded requests are ignored, and announcements are de-duped per outage. Pass `onFetchError` to run a side effect (logging, toast) — it fires once per outage and re-arms after the next successful fetch.

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
} = Autocomplete.Parts;
```

## Form submission

Inside a `Field.Root`, the field's `name` identifies the value and these props are unnecessary —
see [Form](./form.md). They matter for **native** submission: a plain `<form>`, `new FormData(form)`,
or a server action.

| Prop       | Type                          | Default | Description                                                                                       |
| ---------- | ----------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `name`     | `string`                      | -       | Names the input for native submission. **Ignored inside a `Field.Root`** — the field's name wins. |
| `form`     | `string`                      | -       | `id` of the owning form, when the control is rendered outside it.                                 |
| `required` | `boolean`                     | `false` | Blocks submission until a value is chosen, surfacing the matching `Field.Error`.                  |
| `inputRef` | `React.Ref<HTMLInputElement>` | -       | Ref to the underlying text input (use for React Hook Form's `field.ref`).                         |

Autocomplete's value is the raw input string, so no value-serialisation hook is needed.

## Examples

### Controlled Autocomplete

```tsx
const [query, setQuery] = useState("");

<Autocomplete items={suggestions} value={query} onValueChange={setQuery} placeholder="Search..." />;
```

### Address Input with Async Suggestions

Type **Maple** or **Oak**, choose a suggestion, and submit to inspect the address. You may also submit your own free text: Autocomplete does not require choosing an existing item. An empty address is blocked by the surrounding `Field` and `Form`. Suggestions and submission are local-only.

<!-- example: address-suggestions -->

### Async with Parts (custom composition)

Combine `Autocomplete.useAsync` with `Autocomplete.Parts` for full control over layout and rendering:

`Autocomplete.useAsync` accepts the same options as `Autocomplete.Async` (including `onFetchError`) and returns:

| Property  | Type         | Description                                             |
| --------- | ------------ | ------------------------------------------------------- |
| `items`   | `T[]`        | Currently loaded items                                  |
| `loading` | `boolean`    | Whether a fetch is in progress                          |
| `error`   | `unknown`    | The error thrown by the last fetch, if any              |
| `retry`   | `() => void` | Re-runs the last fetch (use to build a custom retry UI) |

Type **k** or **to** to start a lookup. The first completed request deliberately fails; **Retry city search** retries the same query and succeeds. Later searches work normally. The custom composition shows loading, an error, Retry, empty results, and the current input text without a backend. `filter={null}` prevents a second filtering pass over the already-filtered results.

<!-- example: async-with-parts -->

## Accessibility

- Input is keyboard accessible with arrow key navigation
- Pressing `Escape` closes the suggestion list
- Selecting a suggestion fills the input with the item's label
- When used standalone (no visible `<label>`), give the input an accessible name with `aria-label` or `aria-labelledby` — otherwise screen readers announce only the current value:

<!-- example: accessible-name -->

## Related Components

- [Select](./select.md) - Non-searchable discrete item selection
- [Combobox](./combobox.md) - Searchable combobox that returns discrete items
- [Input](./input.md) - Plain text input without suggestions
