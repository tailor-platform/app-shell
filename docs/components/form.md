---
title: Form, Field, and Fieldset
description: Components for building validated forms with automatic accessibility wiring, validation state management, and optional React Hook Form integration
---

# Form, Field, and Fieldset

`Form`, `Field`, and `Fieldset` are compound components for building accessible, validated forms. They handle label association, `aria-describedby`, validation state, and external error routing automatically.

## Import

```tsx
import { Form, Field, Fieldset } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Form onFormSubmit={(values) => save(values)}>
  <Field.Root name="email">
    <Field.Label>Email</Field.Label>
    <Field.Control type="email" required />
    <Field.Description>We'll never share your email.</Field.Description>
    <Field.Error match="valueMissing">Email is required.</Field.Error>
    <Field.Error match="typeMismatch">Enter a valid email address.</Field.Error>
  </Field.Root>
  <button type="submit">Save</button>
</Form>
```

---

## Form

A form element with consolidated error handling and validation. Wraps every child `Field.Root` in a shared validation context.

### Form Props

| Prop               | Type                                                              | Default      | Description                                                                                                                             |
| ------------------ | ----------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `children`         | `React.ReactNode`                                                 | **Required** | Form contents                                                                                                                           |
| `onFormSubmit`     | `(values: FormValues, details: FormSubmitEventDetails) => void`   | -            | Called after successful validation with parsed form values. Prefer this for simple forms. Use a type argument for type-safe values.     |
| `onSubmit`         | `React.FormEventHandler`                                          | -            | Low-level native submit handler. Use when integrating with React Hook Form's `handleSubmit`.                                            |
| `errors`           | `Record<string, string>`                                          | -            | External errors keyed by field `name` (e.g. from an API response). Automatically routed to matching `Field.Error` components.           |
| `validationMode`   | `"onSubmit" \| "onBlur" \| "onChange"`                            | `"onSubmit"` | Controls when field validation fires.                                                                                                   |
| `noValidate`       | `boolean`                                                         | -            | Disables native browser validation UI (recommended — AppShell renders its own).                                                         |
| `actionsRef`       | `React.Ref<{ validate: () => void }>`                             | -            | Ref to imperatively trigger validation from outside the submit flow.                                                                    |
| `className`        | `string`                                                          | -            | Additional CSS classes for the `<form>` element.                                                                                        |

### External Errors

Feed API validation errors back into the form via the `errors` prop. Errors are keyed by field `name` and cleared automatically when the user edits the corresponding field.

```tsx
const [errors, setErrors] = React.useState({});

async function handleSubmit(values) {
  const res = await api.save(values);
  if (res.errors) setErrors(res.errors);
}

<Form errors={errors} onFormSubmit={handleSubmit}>
  <Field.Root name="url">
    <Field.Label>Homepage</Field.Label>
    <Field.Control type="url" required />
    <Field.Error />
  </Field.Root>
  <button type="submit">Submit</button>
</Form>;
```

### Programmatic Validation

Use `actionsRef` to imperatively trigger validation (e.g. in a multi-step wizard).

```tsx
const actions = React.useRef(null);

<Form actionsRef={actions}>
  <Field.Root name="name">
    <Field.Label>Name</Field.Label>
    <Field.Control required />
    <Field.Error>Name is required.</Field.Error>
  </Field.Root>
</Form>;

<button onClick={() => actions.current?.validate()}>Check</button>;
```

---

## Field

A compound component that groups all parts of a form field and manages its validation state.

`Field.Root` creates a context boundary. All child sub-components and any Base UI-backed AppShell component (e.g. `Select`, `Combobox`, `Autocomplete`) placed inside `Field.Root` automatically connect to this context — inheriting label association (`htmlFor`), `aria-describedby`, `disabled` state, and validation state.

### Sub-components

| Sub-component      | Description                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `Field.Root`       | Context boundary for a single field. Manages validation state.                               |
| `Field.Label`      | Accessible label; `htmlFor` is resolved automatically via context.                           |
| `Field.Control`    | Styled `<input>`. Can be omitted when using a Base UI-backed AppShell component as the input. |
| `Field.Description`| Supplementary help text; automatically linked via `aria-describedby`.                        |
| `Field.Error`      | Validation error message. Use `match` to target specific validity states.                    |
| `Field.Validity`   | Render-prop access to the field's `ValidityState` for fully custom validation UI.             |

### Field.Root Props

| Prop                    | Type                          | Default | Description                                                                                         |
| ----------------------- | ----------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `name`                  | `string`                      | -       | Field name; used for form value extraction and error routing.                                       |
| `children`              | `React.ReactNode`             | -       | Field sub-components and input controls.                                                            |
| `disabled`              | `boolean`                     | -       | Disables all controls within the field.                                                             |
| `isTouched`             | `boolean`                     | -       | Whether the field has been blurred. Maps to React Hook Form's `fieldState.isTouched`.               |
| `isDirty`               | `boolean`                     | -       | Whether the field value differs from its default. Maps to React Hook Form's `fieldState.isDirty`.   |
| `invalid`               | `boolean`                     | -       | Marks the field as invalid (shows error styling).                                                   |
| `error`                 | `{ message?: string }`        | -       | Error object from React Hook Form's `fieldState.error`. Sets `invalid` automatically when provided. |
| `validate`              | `(value: string) => string \| undefined` | - | Custom validation function; return an error message string to mark the field invalid.          |
| `validationMode`        | `"onSubmit" \| "onBlur" \| "onChange"` | -   | Overrides the parent Form's `validationMode` for this field.                                    |
| `validationDebounceTime`| `number`                      | -       | Debounce delay (ms) for `"onChange"` validation mode.                                               |
| `className`             | `string`                      | -       | Additional CSS classes for the field wrapper.                                                       |

### Field.Error Props

| Prop       | Type                                                              | Default | Description                                                                                                   |
| ---------- | ----------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `match`    | `keyof ValidityState \| boolean \| ((value: string) => boolean)` | -       | Validity state key to match (e.g. `"valueMissing"`, `"typeMismatch"`). Omit for a catch-all error message.    |
| `children` | `React.ReactNode`                                                 | -       | Error message content. If omitted, the browser's native validation message is shown.                          |

### Using Another AppShell Component as the Control

`Field.Control` can be omitted when using a Base UI-backed AppShell component (e.g. `Select`, `Combobox`). The component registers itself with the `Field` context automatically, inheriting label association and validation state.

```tsx
<Field.Root name="country">
  <Field.Label>Country</Field.Label>
  <Select>
    <Select.Trigger>
      <Select.Value placeholder="Select a country" />
    </Select.Trigger>
    <Select.Popup>
      <Select.Item value="jp">Japan</Select.Item>
      <Select.Item value="us">United States</Select.Item>
    </Select.Popup>
  </Select>
  <Field.Error>Please select a country.</Field.Error>
</Field.Root>
```

### Custom Validation UI with Field.Validity

`Field.Validity` exposes the field's `ValidityState` via a render callback, enabling fully custom validation UI.

```tsx
<Field.Root name="password">
  <Field.Label>Password</Field.Label>
  <Field.Control type="password" required minLength={8} />
  <Field.Validity>
    {(state) => (
      <ul>
        <li>{state.validity.valueMissing ? "❌" : "✅"} Required</li>
        <li>{state.validity.tooShort ? "❌" : "✅"} At least 8 characters</li>
      </ul>
    )}
  </Field.Validity>
</Field.Root>
```

---

## Fieldset

A compound component (`Fieldset.Root`, `Fieldset.Legend`) for grouping related fields with a shared legend for accessible form sectioning.

### Sub-components

| Sub-component      | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `Fieldset.Root`    | Renders a `<fieldset>`. Propagates `disabled` to all children. |
| `Fieldset.Legend`  | Accessible `<legend>` for the group.                           |

### Fieldset.Root Props

| Prop        | Type              | Default | Description                                |
| ----------- | ----------------- | ------- | ------------------------------------------ |
| `children`  | `React.ReactNode` | -       | Field components to group.                 |
| `disabled`  | `boolean`         | -       | Disables all controls within the fieldset. |
| `className` | `string`          | -       | Additional CSS classes.                    |

### Example

```tsx
<Fieldset.Root>
  <Fieldset.Legend>Billing details</Fieldset.Legend>
  <Field.Root name="company">
    <Field.Label>Company</Field.Label>
    <Field.Control />
  </Field.Root>
  <Field.Root name="taxId">
    <Field.Label>Tax ID</Field.Label>
    <Field.Control />
  </Field.Root>
</Fieldset.Root>
```

---

## React Hook Form Integration

`Field.Root` accepts `isTouched`, `isDirty`, `invalid`, and `error` props that align with React Hook Form's `fieldState` shape, so you can spread `fieldState` directly. Use `Form`'s `onSubmit` prop to connect RHF's `handleSubmit`.

```tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

function MyForm() {
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <Form onSubmit={handleSubmit((data) => save(data))}>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Field.Root {...fieldState}>
            <Field.Label>Email</Field.Label>
            <Field.Control {...field} type="email" />
            <Field.Error>{fieldState.error?.message}</Field.Error>
          </Field.Root>
        )}
      />
      <button type="submit">Save</button>
    </Form>
  );
}
```

The `Field` context handles only accessibility wiring (`htmlFor`, `aria-describedby`) and visual state (`data-invalid`, `data-dirty`, `data-touched`) — it does not interfere with RHF's value management or validation lifecycle.

---

## Related

- [Input](./input.md) — Standalone styled input, useful outside of forms.
- [Select](./select.md) — Dropdown that integrates automatically with `Field`.
- [Combobox](./combobox.md) — Searchable combobox that integrates automatically with `Field`.
- [Autocomplete](./autocomplete.md) — Free-text input with suggestions that integrates automatically with `Field`.
