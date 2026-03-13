# Combobox

Searchable select input with keyboard navigation. Supports single/multi-select, chips, creatable items, and async fetching.

## Parts

| Part                  | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `Combobox.Root`       | Root provider (accepts `items`, `value`, `onValueChange`, `filter`)     |
| `Combobox.InputGroup` | Container for input + trigger + clear (renders defaults if no children) |
| `Combobox.Input`      | Text input                                                              |
| `Combobox.Trigger`    | Dropdown toggle button                                                  |
| `Combobox.Clear`      | Clear button                                                            |
| `Combobox.Content`    | Dropdown popup (includes portal and positioner)                         |
| `Combobox.List`       | Scrollable item list                                                    |
| `Combobox.Item`       | Individual option (includes check indicator)                            |
| `Combobox.Empty`      | Shown when no items match                                               |
| `Combobox.Group`      | Groups related items                                                    |
| `Combobox.GroupLabel` | Label for a group                                                       |
| `Combobox.Chips`      | Multi-select chip container                                             |
| `Combobox.Chip`       | Individual chip                                                         |
| `Combobox.ChipRemove` | Remove button on a chip                                                 |
| `Combobox.Value`      | Renders selected value text                                             |
| `Combobox.Collection` | Server-side collection                                                  |
| `Combobox.Status`     | Screen-reader status (sr-only)                                          |

## Root Props

| Prop                 | Type                               | Default     | Description                                                    |
| -------------------- | ---------------------------------- | ----------- | -------------------------------------------------------------- |
| `items`              | `Value[]`                          | —           | Items to display                                               |
| `multiple`           | `boolean`                          | `false`     | Enable multi-select mode (`value` becomes `Value[]`)           |
| `value`              | `Value \| Value[] \| null`         | —           | Controlled selected value (array when `multiple`)              |
| `defaultValue`       | `Value \| Value[] \| null`         | —           | Initial uncontrolled value                                     |
| `onValueChange`      | `(value, details) => void`         | —           | Called when selection changes                                  |
| `inputValue`         | `string`                           | —           | Controlled input text                                          |
| `onInputValueChange` | `(value: string, details) => void` | —           | Called when input text changes                                 |
| `filter`             | `FilterFunction \| null`           | built-in    | Client-side filter. Pass `null` for async/server-filtered data |
| `itemToStringLabel`  | `(value: Value) => string`         | —           | Convert object values to display string in input               |
| `itemToStringValue`  | `(value: Value) => string`         | —           | Convert object values for form submission                      |
| `isItemEqualToValue` | `(a: Value, b: Value) => boolean`  | `Object.is` | Custom equality check for object values                        |
| `autoHighlight`      | `boolean`                          | `false`     | Auto-highlight first match while filtering                     |

## Hooks

| Hook                    | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `Combobox.useFilter`    | Client-side filtering hook (from Base UI)          |
| `Combobox.useCreatable` | Enables on-the-fly item creation from the dropdown |
| `Combobox.useAsync`     | Async fetching with debounce and abort support     |

## Example

```tsx
import { Combobox } from "@tailor-platform/app-shell";

const fruits = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
];

<Combobox.Root items={fruits} itemToStringLabel={(item) => item.label}>
  <Combobox.InputGroup />
  <Combobox.Content>
    <Combobox.List>
      {(item) => <Combobox.Item key={item.value}>{item.label}</Combobox.Item>}
    </Combobox.List>
    <Combobox.Empty>No results found.</Combobox.Empty>
  </Combobox.Content>
</Combobox.Root>;
```

## Multi-Select Example

```tsx
import { Combobox } from "@tailor-platform/app-shell";

const fruits = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Cherry", value: "cherry" },
];

<Combobox.Root multiple items={fruits} itemToStringLabel={(item) => item.label}>
  <Combobox.Chips>
    {(item) => (
      <Combobox.Chip>
        {item.label}
        <Combobox.ChipRemove />
      </Combobox.Chip>
    )}
    <Combobox.Input placeholder="Add fruit..." />
  </Combobox.Chips>
  <Combobox.Content>
    <Combobox.List>
      {(item) => <Combobox.Item key={item.value}>{item.label}</Combobox.Item>}
    </Combobox.List>
    <Combobox.Empty>No results found.</Combobox.Empty>
  </Combobox.Content>
</Combobox.Root>;
```

## Creatable Example

```tsx
const creatable = Combobox.useCreatable({
  items: tags,
  getLabel: (tag) => tag.name,
  createItem: (value) => ({ name: value }),
  onItemCreated: async (item) => {
    await api.createTag(item);
    setTags((prev) => [...prev, item]);
  },
});

<Combobox.Root
  items={creatable.items}
  inputValue={creatable.inputValue}
  onInputValueChange={creatable.onInputValueChange}
  value={creatable.value}
  onValueChange={creatable.onValueChange}
>
  <Combobox.InputGroup />
  <Combobox.Content>
    <Combobox.List>
      {(item) => (
        <Combobox.Item key={item.name}>
          {creatable.isCreateItem(item)
            ? creatable.formatCreateLabel(creatable.getCreateLabel(item)!)
            : item.name}
        </Combobox.Item>
      )}
    </Combobox.List>
    <Combobox.Empty>No results found.</Combobox.Empty>
  </Combobox.Content>
</Combobox.Root>;
```

### `useCreatable` Options

| Option              | Type                                  | Description                                                         |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `items`             | `T[]`                                 | Current items list                                                  |
| `getLabel`          | `(item: T) => string`                 | Extract display label from an item                                  |
| `createItem`        | `(value: string) => T`                | Factory to create a new item from user input                        |
| `multiple`          | `boolean`                             | Enable multi-select mode (default: `false`)                         |
| `defaultValue`      | `T \| T[] \| null`                    | Initial selected value                                              |
| `onValueChange`     | `(value) => void`                     | Called when selection changes                                       |
| `onItemCreated`     | `(item, resolve?) => void \| Promise` | Called when a new item is created (see patterns below)              |
| `formatCreateLabel` | `(value: string) => string`           | Customize the "Create X" label (default: `` `Create "${value}"` ``) |

### `onItemCreated` Patterns

```tsx
// Sync — call resolve() immediately
onItemCreated: (item, resolve) => {
  setItems((prev) => [...prev, item]);
  resolve();
};

// Async — return a Promise
onItemCreated: async (item) => {
  await api.create(item);
  setItems((prev) => [...prev, item]);
  // auto-accept on fulfillment, auto-cancel on rejection
};

// Deferred — resolve later (e.g. confirmation dialog)
onItemCreated: (item, resolve) => {
  showDialog({
    onConfirm: () => {
      setItems((p) => [...p, item]);
      resolve();
    },
    onCancel: () => resolve(false),
  });
};
```

## Creatable Multi-Select Example

```tsx
const creatable = Combobox.useCreatable({
  multiple: true,
  items: tags,
  getLabel: (tag) => tag.name,
  createItem: (value) => ({ name: value }),
  onItemCreated: async (item) => {
    await api.createTag(item);
    setTags((prev) => [...prev, item]);
  },
});

<Combobox.Root
  multiple
  items={creatable.items}
  inputValue={creatable.inputValue}
  onInputValueChange={creatable.onInputValueChange}
  value={creatable.value}
  onValueChange={creatable.onValueChange}
>
  <Combobox.Chips>
    {(item) => (
      <Combobox.Chip>
        {item.name}
        <Combobox.ChipRemove />
      </Combobox.Chip>
    )}
    <Combobox.Input />
  </Combobox.Chips>
  <Combobox.Content>
    <Combobox.List>
      {(item) => (
        <Combobox.Item key={item.name}>
          {creatable.isCreateItem(item)
            ? creatable.formatCreateLabel(creatable.getCreateLabel(item)!)
            : item.name}
        </Combobox.Item>
      )}
    </Combobox.List>
  </Combobox.Content>
</Combobox.Root>;
```

## Async Example

```tsx
const countries = Combobox.useAsync({
  fetcher: async (query, { signal }) => {
    const res = await fetch(`/api/countries?q=${query}`, { signal });
    if (!res.ok) return [];
    return res.json();
  },
  debounceMs: 300,
});

<Combobox.Root
  items={countries.items}
  filter={null}
  onInputValueChange={countries.onInputValueChange}
>
  {/* ... */}
  <Combobox.Empty>{countries.loading ? "Loading..." : "No results."}</Combobox.Empty>
</Combobox.Root>;
```
