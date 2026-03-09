# Components

AppShell provides a set of pre-styled UI components. All components use the `astw:` Tailwind prefix and support className overrides.

## Table of Contents

- [Accordion](#accordion)
- [AlertDialog](#alertdialog)
- [Autocomplete](#autocomplete)
- [Avatar](#avatar)
- [Badge](#badge)
- [Breadcrumb](#breadcrumb)
- [Button](#button)
- [Checkbox](#checkbox)
- [Collapsible](#collapsible)
- [Combobox](#combobox)
- [DescriptionCard](#descriptioncard)
- [Dialog](#dialog)
- [Field](#field)
- [Fieldset](#fieldset)
- [Form](#form)
- [Input](#input)
- [Label](#label)
- [Layout](#layout)
- [Meter](#meter)
- [NumberField](#numberfield)
- [Popover](#popover)
- [PreviewCard](#previewcard)
- [Progress](#progress)
- [Radio](#radio)
- [ScrollArea](#scrollarea)
- [Select](#select)
- [Separator](#separator)
- [Sheet](#sheet)
- [Slider](#slider)
- [Switch](#switch)
- [Table](#table)
- [Tabs](#tabs)
- [Toggle](#toggle)
- [Toolbar](#toolbar)
- [Tooltip](#tooltip)

---

## Accordion

Collapsible content sections.

### Parts

| Part | Description |
|------|-------------|
| `Accordion.Root` | Container for all accordion items |
| `Accordion.Item` | Individual collapsible section |
| `Accordion.Trigger` | Button that toggles the section (includes chevron icon) |
| `Accordion.Content` | Collapsible panel content |

### Example

```tsx
import { Accordion } from "@tailor-platform/app-shell";

<Accordion.Root>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>Section 1</Accordion.Trigger>
    <Accordion.Content>Content for section 1</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="item-2">
    <Accordion.Trigger>Section 2</Accordion.Trigger>
    <Accordion.Content>Content for section 2</Accordion.Content>
  </Accordion.Item>
</Accordion.Root>
```

---

## AlertDialog

Modal dialog requiring user confirmation.

### Parts

| Part | Description |
|------|-------------|
| `AlertDialog.Root` | Root provider |
| `AlertDialog.Trigger` | Button that opens the dialog |
| `AlertDialog.Content` | Dialog content (includes overlay and portal) |
| `AlertDialog.Header` | Header container |
| `AlertDialog.Footer` | Footer container (action buttons) |
| `AlertDialog.Title` | Dialog title |
| `AlertDialog.Description` | Dialog description text |
| `AlertDialog.Action` | Confirm action button |
| `AlertDialog.Cancel` | Cancel button (closes dialog) |

### Example

```tsx
import { AlertDialog } from "@tailor-platform/app-shell";

<AlertDialog.Root>
  <AlertDialog.Trigger>Delete Item</AlertDialog.Trigger>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onClick={handleDelete}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
```

---

## Autocomplete

Text input with suggestion dropdown.

### Parts

| Part | Description |
|------|-------------|
| `Autocomplete.Root` | Root provider (accepts `items`, `value`, `onValueChange`, `filter`) |
| `Autocomplete.InputGroup` | Container for input + trigger + clear (renders defaults if no children) |
| `Autocomplete.Input` | Text input |
| `Autocomplete.Trigger` | Dropdown toggle button |
| `Autocomplete.Clear` | Clear button |
| `Autocomplete.Content` | Dropdown popup (includes portal and positioner) |
| `Autocomplete.List` | Scrollable item list |
| `Autocomplete.Item` | Individual option |
| `Autocomplete.Empty` | Shown when no items match |
| `Autocomplete.Group` | Groups related items |
| `Autocomplete.GroupLabel` | Label for a group |
| `Autocomplete.Value` | Renders the selected value |
| `Autocomplete.Collection` | Server-side collection renderer |
| `Autocomplete.Status` | Screen-reader status (sr-only) |

### Root Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Value[]` | — | Items to display in the list |
| `value` | `string` | — | Controlled input value |
| `defaultValue` | `string` | — | Initial uncontrolled input value |
| `onValueChange` | `(value: string, details) => void` | — | Called when input value changes |
| `filter` | `FilterFunction \| null` | built-in | Client-side filter. Pass `null` to disable (e.g. for async sources) |
| `mode` | `"list" \| "both" \| "inline" \| "none"` | `"list"` | Controls filtering and inline autocompletion behavior |
| `autoHighlight` | `boolean \| "always"` | `false` | Auto-highlight first matching item |
| `openOnInputClick` | `boolean` | `false` | Open popup when clicking the input |
| `itemToStringValue` | `(value: Value) => string` | — | Convert object values to string for display and form submission |

### Hooks

| Hook | Description |
|------|-------------|
| `Autocomplete.useFilter` | Client-side filtering hook (from Base UI) |
| `Autocomplete.useAsync` | Async fetching with debounce and abort support |

### Example

```tsx
import { Autocomplete } from "@tailor-platform/app-shell";

const fruits = ["Apple", "Banana", "Cherry", "Date"];

<Autocomplete.Root items={fruits}>
  <Autocomplete.InputGroup />
  <Autocomplete.Content>
    <Autocomplete.List>
      {(item) => <Autocomplete.Item>{item}</Autocomplete.Item>}
    </Autocomplete.List>
    <Autocomplete.Empty>No results found.</Autocomplete.Empty>
  </Autocomplete.Content>
</Autocomplete.Root>
```

### Async Example

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
  value={movies.query}
  onValueChange={movies.onValueChange}
  filter={null}
>
  <Autocomplete.InputGroup />
  <Autocomplete.Content>
    <Autocomplete.List>
      {(item) => <Autocomplete.Item>{item.title}</Autocomplete.Item>}
    </Autocomplete.List>
    <Autocomplete.Empty>
      {movies.loading ? "Loading..." : "No results."}
    </Autocomplete.Empty>
  </Autocomplete.Content>
</Autocomplete.Root>
```

---

## Avatar

User avatar with image and fallback.

### Parts

| Part | Description |
|------|-------------|
| `Avatar.Root` | Circular container (default: 32×32px) |
| `Avatar.Image` | Avatar image |
| `Avatar.Fallback` | Shown when image fails to load |

### Example

```tsx
import { Avatar } from "@tailor-platform/app-shell";

<Avatar.Root>
  <Avatar.Image src="/avatar.jpg" alt="User" />
  <Avatar.Fallback>JD</Avatar.Fallback>
</Avatar.Root>
```

---

## Badge

Status badge component with semantic variants.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `BadgeVariant` | `"default"` | Badge style variant |
| `children` | `React.ReactNode` | — | Badge content |
| `className` | `string` | — | Additional CSS classes |

**Variants:** `default`, `success`, `warning`, `error`, `neutral`, `outline-success`, `outline-warning`, `outline-error`, `outline-info`, `outline-neutral`

### Example

```tsx
import { Badge } from "@tailor-platform/app-shell";

<Badge variant="success">Active</Badge>
<Badge variant="outline-warning">Pending</Badge>
```

---

## Breadcrumb

Navigation breadcrumb trail.

### Parts

| Part | Description |
|------|-------------|
| `Breadcrumb.Root` | Nav container (`<nav>`) |
| `Breadcrumb.List` | Ordered list |
| `Breadcrumb.Item` | Individual breadcrumb item |
| `Breadcrumb.Link` | Clickable link (uses react-router `Link`) |
| `Breadcrumb.Page` | Current page (non-clickable) |
| `Breadcrumb.Separator` | Separator between items (default: chevron) |
| `Breadcrumb.Ellipsis` | Ellipsis for collapsed items |

### Example

```tsx
import { Breadcrumb } from "@tailor-platform/app-shell";

<Breadcrumb.Root>
  <Breadcrumb.List>
    <Breadcrumb.Item>
      <Breadcrumb.Link to="/">Home</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Separator />
    <Breadcrumb.Item>
      <Breadcrumb.Link to="/products">Products</Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Separator />
    <Breadcrumb.Item>
      <Breadcrumb.Page>Current Page</Breadcrumb.Page>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb.Root>
```

---

## Button

Button component with multiple variants and sizes. Supports polymorphic rendering via `render` prop.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | Visual style |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | Button size |
| `render` | `React.ReactElement` | — | Render as a different element (e.g., `<Link>`) |

### Example

```tsx
import { Button } from "@tailor-platform/app-shell";
import { Link } from "react-router";

<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="sm">Small Outline</Button>
<Button render={<Link to="/page" />}>Navigate</Button>
```

---

## Checkbox

Checkbox input with indeterminate state support.

### Parts

| Part | Description |
|------|-------------|
| `Checkbox.Root` | Single checkbox (includes check/minus indicator) |
| `Checkbox.Group` | Groups related checkboxes |

### Example

```tsx
import { Checkbox } from "@tailor-platform/app-shell";

{/* Single checkbox */}
<Checkbox.Root />

{/* Group of checkboxes */}
<Checkbox.Group>
  <label><Checkbox.Root /> Option A</label>
  <label><Checkbox.Root /> Option B</label>
</Checkbox.Group>
```

---

## Collapsible

Expandable/collapsible content section.

### Parts

| Part | Description |
|------|-------------|
| `Collapsible.Root` | Root provider |
| `Collapsible.Trigger` | Toggle button |
| `Collapsible.Content` | Collapsible panel |

### Example

```tsx
import { Collapsible } from "@tailor-platform/app-shell";

<Collapsible.Root>
  <Collapsible.Trigger>Toggle</Collapsible.Trigger>
  <Collapsible.Content>
    Collapsible content here.
  </Collapsible.Content>
</Collapsible.Root>
```

---

## Combobox

Searchable select input with keyboard navigation. Supports single/multi-select, chips, creatable items, and async fetching.

### Parts

| Part | Description |
|------|-------------|
| `Combobox.Root` | Root provider (accepts `items`, `value`, `onValueChange`, `filter`) |
| `Combobox.InputGroup` | Container for input + trigger + clear (renders defaults if no children) |
| `Combobox.Input` | Text input |
| `Combobox.Trigger` | Dropdown toggle button |
| `Combobox.Clear` | Clear button |
| `Combobox.Content` | Dropdown popup (includes portal and positioner) |
| `Combobox.List` | Scrollable item list |
| `Combobox.Item` | Individual option (includes check indicator) |
| `Combobox.Empty` | Shown when no items match |
| `Combobox.Group` | Groups related items |
| `Combobox.GroupLabel` | Label for a group |
| `Combobox.Chips` | Multi-select chip container |
| `Combobox.Chip` | Individual chip |
| `Combobox.ChipRemove` | Remove button on a chip |
| `Combobox.Value` | Renders selected value text |
| `Combobox.Collection` | Server-side collection |
| `Combobox.Status` | Screen-reader status (sr-only) |

### Root Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `Value[]` | — | Items to display |
| `multiple` | `boolean` | `false` | Enable multi-select mode (`value` becomes `Value[]`) |
| `value` | `Value \| Value[] \| null` | — | Controlled selected value (array when `multiple`) |
| `defaultValue` | `Value \| Value[] \| null` | — | Initial uncontrolled value |
| `onValueChange` | `(value, details) => void` | — | Called when selection changes |
| `inputValue` | `string` | — | Controlled input text |
| `onInputValueChange` | `(value: string, details) => void` | — | Called when input text changes |
| `filter` | `FilterFunction \| null` | built-in | Client-side filter. Pass `null` for async/server-filtered data |
| `itemToStringLabel` | `(value: Value) => string` | — | Convert object values to display string in input |
| `itemToStringValue` | `(value: Value) => string` | — | Convert object values for form submission |
| `isItemEqualToValue` | `(a: Value, b: Value) => boolean` | `Object.is` | Custom equality check for object values |
| `autoHighlight` | `boolean` | `false` | Auto-highlight first match while filtering |

### Hooks

| Hook | Description |
|------|-------------|
| `Combobox.useFilter` | Client-side filtering hook (from Base UI) |
| `Combobox.useCreatable` | Enables on-the-fly item creation from the dropdown |
| `Combobox.useAsync` | Async fetching with debounce and abort support |

### Example

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
      {(item) => (
        <Combobox.Item key={item.value}>{item.label}</Combobox.Item>
      )}
    </Combobox.List>
    <Combobox.Empty>No results found.</Combobox.Empty>
  </Combobox.Content>
</Combobox.Root>
```

### Multi-Select Example

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
      {(item) => (
        <Combobox.Item key={item.value}>{item.label}</Combobox.Item>
      )}
    </Combobox.List>
    <Combobox.Empty>No results found.</Combobox.Empty>
  </Combobox.Content>
</Combobox.Root>
```

### Creatable Example

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
</Combobox.Root>
```

#### `useCreatable` Options

| Option | Type | Description |
|--------|------|-------------|
| `items` | `T[]` | Current items list |
| `getLabel` | `(item: T) => string` | Extract display label from an item |
| `createItem` | `(value: string) => T` | Factory to create a new item from user input |
| `multiple` | `boolean` | Enable multi-select mode (default: `false`) |
| `defaultValue` | `T \| T[] \| null` | Initial selected value |
| `onValueChange` | `(value) => void` | Called when selection changes |
| `onItemCreated` | `(item, resolve?) => void \| Promise` | Called when a new item is created (see patterns below) |
| `formatCreateLabel` | `(value: string) => string` | Customize the "Create X" label (default: `` `Create "${value}"` ``) |

#### `onItemCreated` Patterns

```tsx
// Sync — call resolve() immediately
onItemCreated: (item, resolve) => {
  setItems((prev) => [...prev, item]);
  resolve();
}

// Async — return a Promise
onItemCreated: async (item) => {
  await api.create(item);
  setItems((prev) => [...prev, item]);
  // auto-accept on fulfillment, auto-cancel on rejection
}

// Deferred — resolve later (e.g. confirmation dialog)
onItemCreated: (item, resolve) => {
  showDialog({
    onConfirm: () => { setItems(p => [...p, item]); resolve(); },
    onCancel: () => resolve(false),
  });
}
```

### Creatable Multi-Select Example

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
</Combobox.Root>
```

### Async Example

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
  <Combobox.Empty>
    {countries.loading ? "Loading..." : "No results."}
  </Combobox.Empty>
</Combobox.Root>
```

---

## DescriptionCard

Card component for displaying structured key-value information, commonly used in ERP document views like orders, invoices, and product details.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `Record<string, unknown>` | Yes | Raw data object containing field values |
| `title` | `string` | Yes | Card title displayed in header |
| `fields` | `FieldConfig[]` | Yes | Array of field configurations and dividers |
| `columns` | `3 \| 4` | No | Number of columns on desktop (defaults to 3) |
| `className` | `string` | No | Additional CSS classes |
| `headerAction` | `React.ReactNode` | No | Action button/component in card header |

**Field Types:** `text`, `badge`, `money`, `date`, `link`, `address`, `reference`

### Example

```tsx
import { DescriptionCard } from "@tailor-platform/app-shell";

<DescriptionCard
  data={order}
  title="Order Summary"
  headerAction={<EditButton />}
  columns={3}
  fields={[
    {
      key: "status",
      label: "Status",
      type: "badge",
      meta: {
        badgeVariantMap: {
          CONFIRMED: "outline-success",
          PENDING: "outline-warning",
        },
      },
    },
    { key: "orderNumber", label: "Order #", meta: { copyable: true } },
    {
      key: "total",
      label: "Total",
      type: "money",
      meta: { currencyKey: "currency" },
    },
    { type: "divider" },
    {
      key: "customer.name",
      label: "Customer",
      type: "reference",
      meta: {
        referenceIdKey: "customer.id",
        referenceUrlPattern: "/customers/{id}",
      },
    },
  ]}
/>
```

---

## Dialog

Modal dialog with overlay.

### Parts

| Part | Description |
|------|-------------|
| `Dialog.Root` | Root provider |
| `Dialog.Trigger` | Open trigger |
| `Dialog.Portal` | Portal container |
| `Dialog.Close` | Close button |
| `Dialog.Overlay` | Background overlay |
| `Dialog.Content` | Dialog content (includes overlay, portal, and close button) |
| `Dialog.Header` | Header container |
| `Dialog.Footer` | Footer container |
| `Dialog.Title` | Dialog title |
| `Dialog.Description` | Dialog description |

### Example

```tsx
import { Dialog, Button } from "@tailor-platform/app-shell";

<Dialog.Root>
  <Dialog.Trigger>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit Profile</Dialog.Title>
      <Dialog.Description>
        Make changes to your profile here.
      </Dialog.Description>
    </Dialog.Header>
    {/* form content */}
    <Dialog.Footer>
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

---

## Field

Form field with label, description, and error message.

### Parts

| Part | Description |
|------|-------------|
| `Field.Root` | Container with flex-col layout |
| `Field.Label` | Label text |
| `Field.Control` | Wraps the input control |
| `Field.Error` | Validation error message |
| `Field.Description` | Help text |

### Example

```tsx
import { Field, Input } from "@tailor-platform/app-shell";

<Field.Root>
  <Field.Label>Email</Field.Label>
  <Field.Control render={<Input type="email" />} />
  <Field.Description>We'll never share your email.</Field.Description>
  <Field.Error>Please enter a valid email.</Field.Error>
</Field.Root>
```

---

## Fieldset

Groups related form fields with a legend.

### Parts

| Part | Description |
|------|-------------|
| `Fieldset.Root` | Fieldset container |
| `Fieldset.Legend` | Legend text |

### Example

```tsx
import { Fieldset, Field, Input } from "@tailor-platform/app-shell";

<Fieldset.Root>
  <Fieldset.Legend>Address</Fieldset.Legend>
  <Field.Root>
    <Field.Label>Street</Field.Label>
    <Field.Control render={<Input />} />
  </Field.Root>
  <Field.Root>
    <Field.Label>City</Field.Label>
    <Field.Control render={<Input />} />
  </Field.Root>
</Fieldset.Root>
```

---

## Form

Form container with flex-col layout and gap.

### Example

```tsx
import { Form, Field, Input, Button } from "@tailor-platform/app-shell";

<Form onSubmit={handleSubmit}>
  <Field.Root>
    <Field.Label>Name</Field.Label>
    <Field.Control render={<Input />} />
  </Field.Root>
  <Button type="submit">Submit</Button>
</Form>
```

---

## Input

Text input component.

### Props

Standard `<input>` props with pre-styled focus, validation, and disabled states.

### Example

```tsx
import { Input } from "@tailor-platform/app-shell";

<Input placeholder="Enter text..." />
<Input type="email" />
<Input disabled />
```

---

## Label

Standalone label component.

### Example

```tsx
import { Label } from "@tailor-platform/app-shell";

<Label>Username</Label>
```

---

## Layout

Responsive column layout component. Responds to container width (not viewport). See the [API Reference](./api.md#layout) for detailed responsive behavior.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `1 \| 2 \| 3` | — | Number of columns |
| `title` | `string` | — | Optional header title |
| `actions` | `React.ReactNode[]` | — | Action buttons in header |
| `gap` | `4 \| 6 \| 8` | `4` | Gap between columns (Tailwind units) |
| `className` | `string` | — | Additional CSS classes |

### Example

```tsx
import { Layout } from "@tailor-platform/app-shell";

<Layout columns={2} title="Edit Product" actions={[<Button key="save">Save</Button>]}>
  <Layout.Column>Main content</Layout.Column>
  <Layout.Column>Side panel</Layout.Column>
</Layout>
```

---

## Meter

Meter/gauge indicator.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Current value |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |

### Example

```tsx
import { Meter } from "@tailor-platform/app-shell";

<Meter value={75} min={0} max={100} />
```

---

## NumberField

Numeric input with increment/decrement buttons.

### Parts

| Part | Description |
|------|-------------|
| `NumberField.Root` | Root provider (accepts `value`, `onValueChange`, `min`, `max`, `step`, etc.) |
| `NumberField.Input` | Numeric input |
| `NumberField.Group` | Container for input + buttons |
| `NumberField.Increment` | Increment button (includes chevron icon) |
| `NumberField.Decrement` | Decrement button (includes chevron icon) |

### Example

```tsx
import { NumberField } from "@tailor-platform/app-shell";

<NumberField.Root defaultValue={0} min={0} max={100}>
  <NumberField.Group>
    <NumberField.Input />
    <NumberField.Increment />
    <NumberField.Decrement />
  </NumberField.Group>
</NumberField.Root>
```

---

## Popover

Floating content anchored to a trigger.

### Parts

| Part | Description |
|------|-------------|
| `Popover.Root` | Root provider |
| `Popover.Trigger` | Trigger element |
| `Popover.Content` | Floating content (includes portal and positioner) |
| `Popover.Close` | Close button |
| `Popover.Arrow` | Arrow pointing to trigger |

### Props (`Popover.Content`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sideOffset` | `number` | `4` | Distance from trigger |

### Example

```tsx
import { Popover, Button } from "@tailor-platform/app-shell";

<Popover.Root>
  <Popover.Trigger>
    <Button variant="outline">Open Popover</Button>
  </Popover.Trigger>
  <Popover.Content>
    <p>Popover content here.</p>
  </Popover.Content>
</Popover.Root>
```

---

## PreviewCard

Hover card that shows a preview.

### Parts

| Part | Description |
|------|-------------|
| `PreviewCard.Root` | Root provider |
| `PreviewCard.Trigger` | Hover trigger |
| `PreviewCard.Content` | Preview content popup |
| `PreviewCard.Arrow` | Arrow pointing to trigger |

### Props (`PreviewCard.Content`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sideOffset` | `number` | `4` | Distance from trigger |
| `side` | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"` | Preferred side |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Alignment |

### Example

```tsx
import { PreviewCard } from "@tailor-platform/app-shell";

<PreviewCard.Root>
  <PreviewCard.Trigger>
    <a href="/profile">@johndoe</a>
  </PreviewCard.Trigger>
  <PreviewCard.Content>
    <p>John Doe - Software Engineer</p>
  </PreviewCard.Content>
</PreviewCard.Root>
```

---

## Progress

Determinate progress bar.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Current progress value |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |

### Example

```tsx
import { Progress } from "@tailor-platform/app-shell";

<Progress value={60} />
```

---

## Radio

Radio button input.

### Parts

| Part | Description |
|------|-------------|
| `Radio.Root` | Single radio button (includes indicator) |
| `Radio.Group` | Groups related radio buttons |

### Example

```tsx
import { Radio } from "@tailor-platform/app-shell";

<Radio.Group defaultValue="option-1">
  <label><Radio.Root value="option-1" /> Option 1</label>
  <label><Radio.Root value="option-2" /> Option 2</label>
  <label><Radio.Root value="option-3" /> Option 3</label>
</Radio.Group>
```

---

## ScrollArea

Custom scrollable container with styled scrollbars.

### Parts

| Part | Description |
|------|-------------|
| `ScrollArea.Root` | Scrollable container (includes viewport, scrollbars, and corner) |
| `ScrollArea.ScrollBar` | Individual scrollbar (vertical or horizontal) |

### Example

```tsx
import { ScrollArea } from "@tailor-platform/app-shell";

<ScrollArea.Root className="h-72 w-48">
  <div>
    {/* Long content */}
  </div>
</ScrollArea.Root>
```

---

## Select

Dropdown select input.

### Parts

| Part | Description |
|------|-------------|
| `Select.Root` | Root provider |
| `Select.Trigger` | Trigger button (includes chevron icon) |
| `Select.Value` | Displays selected value |
| `Select.Content` | Dropdown content (includes portal and positioner) |
| `Select.Item` | Individual option (includes check indicator) |
| `Select.Group` | Groups related options |
| `Select.GroupLabel` | Label for a group |
| `Select.Separator` | Visual separator between items |

### Example

```tsx
import { Select } from "@tailor-platform/app-shell";

<Select.Root>
  <Select.Trigger>
    <Select.Value placeholder="Select a fruit..." />
  </Select.Trigger>
  <Select.Content>
    <Select.Item value="apple">Apple</Select.Item>
    <Select.Item value="banana">Banana</Select.Item>
    <Select.Separator />
    <Select.Item value="cherry">Cherry</Select.Item>
  </Select.Content>
</Select.Root>
```

---

## Separator

Visual separator line.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Separator direction |

### Example

```tsx
import { Separator } from "@tailor-platform/app-shell";

<Separator />
<Separator orientation="vertical" />
```

---

## Sheet

Side panel that slides in from the edge.

### Parts

| Part | Description |
|------|-------------|
| `Sheet.Root` | Root provider |
| `Sheet.Trigger` | Open trigger |
| `Sheet.Close` | Close button |
| `Sheet.Content` | Slide-in panel (includes overlay and close button) |
| `Sheet.Header` | Header container |
| `Sheet.Footer` | Footer container |
| `Sheet.Title` | Sheet title |
| `Sheet.Description` | Sheet description |

### Props (`Sheet.Content`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `side` | `"top" \| "right" \| "bottom" \| "left"` | `"right"` | Which edge to slide from |

### Example

```tsx
import { Sheet, Button } from "@tailor-platform/app-shell";

<Sheet.Root>
  <Sheet.Trigger>
    <Button variant="outline">Open Sheet</Button>
  </Sheet.Trigger>
  <Sheet.Content side="right">
    <Sheet.Header>
      <Sheet.Title>Edit Settings</Sheet.Title>
      <Sheet.Description>Make changes to your settings.</Sheet.Description>
    </Sheet.Header>
    {/* content */}
    <Sheet.Footer>
      <Button>Save</Button>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
```

---

## Slider

Range slider input.

### Parts

| Part | Description |
|------|-------------|
| `Slider.Root` | Root provider with built-in track and thumb (accepts `defaultValue`, `min`, `max`, `step`) |
| `Slider.Control` | Slider control container |
| `Slider.Track` | Track with range indicator |
| `Slider.Thumb` | Draggable thumb |

### Example

```tsx
import { Slider } from "@tailor-platform/app-shell";

<Slider.Root defaultValue={[50]} min={0} max={100} step={1} />
```

---

## Switch

Toggle switch.

### Props

Standard switch props: `checked`, `onCheckedChange`, `disabled`, etc.

### Example

```tsx
import { Switch } from "@tailor-platform/app-shell";

<Switch />
<Switch defaultChecked />
```

---

## Table

Data table components.

### Parts

| Part | Description |
|------|-------------|
| `Table.Root` | Table container with scroll area |
| `Table.Header` | Table header (`<thead>`, sticky) |
| `Table.Body` | Table body (`<tbody>`) |
| `Table.Footer` | Table footer (`<tfoot>`, sticky) |
| `Table.Row` | Table row (`<tr>`) |
| `Table.Head` | Header cell (`<th>`) |
| `Table.Cell` | Data cell (`<td>`) |

### Props (`Table.Root`)

| Prop | Type | Description |
|------|------|-------------|
| `containerClassName` | `string` | CSS classes for scroll container |
| `containerStyle` | `React.CSSProperties` | Inline styles for scroll container |

### Example

```tsx
import { Table } from "@tailor-platform/app-shell";

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Name</Table.Head>
      <Table.Head>Email</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.Cell>John Doe</Table.Cell>
      <Table.Cell>john@example.com</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table.Root>
```

---

## Tabs

Tabbed navigation.

### Parts

| Part | Description |
|------|-------------|
| `Tabs.Root` | Root provider |
| `Tabs.List` | Tab button container |
| `Tabs.Trigger` | Individual tab button |
| `Tabs.Content` | Tab panel content |

### Example

```tsx
import { Tabs } from "@tailor-platform/app-shell";

<Tabs.Root defaultValue="tab1">
  <Tabs.List>
    <Tabs.Trigger value="tab1">General</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Security</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1">General settings...</Tabs.Content>
  <Tabs.Content value="tab2">Security settings...</Tabs.Content>
</Tabs.Root>
```

---

## Toggle

Pressable toggle button.

### Parts

| Part | Description |
|------|-------------|
| `Toggle.Root` | Single toggle button |
| `Toggle.Group` | Groups related toggle buttons |

### Props (Toggle.Root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "outline"` | `"default"` | Visual style |
| `size` | `"default" \| "sm" \| "lg"` | `"default"` | Button size |

### Example

```tsx
import { Toggle } from "@tailor-platform/app-shell";
import { Bold, Italic, Underline } from "lucide-react";

{/* Single toggle */}
<Toggle.Root aria-label="Toggle bold">
  <Bold className="size-4" />
</Toggle.Root>

{/* Toggle group */}
<Toggle.Group>
  <Toggle.Root aria-label="Bold"><Bold className="size-4" /></Toggle.Root>
  <Toggle.Root aria-label="Italic"><Italic className="size-4" /></Toggle.Root>
  <Toggle.Root aria-label="Underline"><Underline className="size-4" /></Toggle.Root>
</Toggle.Group>
```

---

## Toolbar

Horizontal toolbar with buttons, separators, and groups.

### Parts

| Part | Description |
|------|-------------|
| `Toolbar.Root` | Toolbar container |
| `Toolbar.Button` | Toolbar button |
| `Toolbar.Separator` | Vertical separator |
| `Toolbar.Group` | Groups related buttons |
| `Toolbar.Link` | Toolbar link |

### Example

```tsx
import { Toolbar } from "@tailor-platform/app-shell";

<Toolbar.Root>
  <Toolbar.Group>
    <Toolbar.Button>Cut</Toolbar.Button>
    <Toolbar.Button>Copy</Toolbar.Button>
    <Toolbar.Button>Paste</Toolbar.Button>
  </Toolbar.Group>
  <Toolbar.Separator />
  <Toolbar.Link href="/help">Help</Toolbar.Link>
</Toolbar.Root>
```

---

## Tooltip

Informational tooltip on hover.

### Parts

| Part | Description |
|------|-------------|
| `Tooltip.Root` | Root provider (includes TooltipProvider) |
| `Tooltip.Trigger` | Hover target |
| `Tooltip.Content` | Tooltip content popup (includes arrow) |

### Props (`Tooltip.Content`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sideOffset` | `number` | `0` | Distance from trigger |
| `side` | `"top" \| "right" \| "bottom" \| "left"` | `"top"` | Preferred side |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Alignment |

### Example

```tsx
import { Tooltip, Button } from "@tailor-platform/app-shell";

<Tooltip.Root>
  <Tooltip.Trigger>
    <Button variant="outline">Hover me</Button>
  </Tooltip.Trigger>
  <Tooltip.Content>This is a tooltip</Tooltip.Content>
</Tooltip.Root>
```
