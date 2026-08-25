---
"@tailor-platform/app-shell": minor
---

Let forms be driven natively: `Form` now accepts `id`, and `Select`, `Combobox`, and `Autocomplete` accept `name`, `form`, `required`, and `inputRef` (plus `itemToStringValue` on `Select` and `Combobox`). These props were already supported by the underlying Base UI roots but were filtered out by the wrapper `Pick<>` types, so there was no way to reach them.

**`Form` `id`** — a submit button rendered outside the form can now target it with the native `form` attribute, which is what the common "Save in the page header, fields in the body" layout needs:

```tsx
<Layout.Header
  title="Create product"
  actions={[<Button key="save" type="submit" form="product-form">Save</Button>]}
/>
<Form id="product-form" onFormSubmit={save}>…</Form>
```

**`name` on the dropdowns** — Base UI renders a hidden input under that name, so the selected value is now visible to native submission: `new FormData(form)`, an uncontrolled `<form>`, and server actions. Previously these controls contributed nothing to the DOM payload, so a native form silently submitted without them.

For non-string items, `itemToStringValue` controls serialisation (items shaped `{ value, label }` use `value` automatically). It is not available on `Combobox`'s creatable variants, which derive it internally so the pending-item sentinel serialises correctly.

Note this is a _separate_ mechanism from `Form`'s `onFormSubmit`, which collects values from registered `Field.Root`s keyed by the field's `name` — that path already worked without `name` on the control and is unchanged.
