---
"@tailor-platform/app-shell": minor
---

Add `Form`, `Fieldset`, and `Field` components for building validated forms.

### `Form`

A form element with consolidated error handling and validation. Supports `onFormSubmit` for type-safe parsed form values, and `onSubmit` for native `FormEvent` access. External errors (e.g. API responses) can be fed via the `errors` prop and are automatically routed to matching `Field.Error` components.

```tsx
<Form onFormSubmit={(values) => save(values)}>
  <Field.Root name="email">
    <Field.Label>Email</Field.Label>
    <Field.Control type="email" required />
    <Field.Error match="typeMismatch">Enter a valid email.</Field.Error>
  </Field.Root>
  <button type="submit">Save</button>
</Form>
```

### `Fieldset`

A compound component (`Fieldset.Root`, `Fieldset.Legend`) for grouping related fields with a shared legend for accessible form sectioning.

```tsx
<Fieldset.Root>
  <Fieldset.Legend>Billing details</Fieldset.Legend>
  <Field.Root name="company">
    <Field.Label>Company</Field.Label>
    <Field.Control />
  </Field.Root>
</Fieldset.Root>
```

### `Field`

A compound component (`Field.Root`, `Field.Label`, `Field.Control`, `Field.Description`, `Field.Error`, `Field.Validity`) that groups all parts of a form field and manages its validation state.

`Field.Root` creates a Field context boundary. All child sub-components (`Field.Label`, `Field.Control`, `Field.Description`, `Field.Error`, `Field.Validity`) and any Base UI-backed AppShell component (e.g. Select, Combobox, Autocomplete) placed inside `Field.Root` automatically connect to this context — inheriting label association (`htmlFor`), `aria-describedby`, disabled state, and validation state (`invalid`, `dirty`, `touched`).

`Field.Control` is a styled `<input>` that shares its base styles with the `Input` component. It can be omitted when using another AppShell input component (e.g. Select, Combobox, Autocomplete) as a sibling — those components register themselves with the Field context automatically. It also supports native HTML constraint attributes (`required`, `type="email"`, `pattern`, etc.) for built-in validation.

```tsx
<Field.Root name="email">
  <Field.Label>Email</Field.Label>
  <Field.Control type="email" required />
  <Field.Description>We'll never share your email.</Field.Description>
  <Field.Error match="typeMismatch">Please enter a valid email.</Field.Error>
</Field.Root>
```

#### Using another AppShell component as the control

`Field.Control` can be omitted when using a Base UI-backed AppShell component (e.g. Select, Combobox). The component registers itself with the Field context automatically, inheriting label association and validation state.

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

#### Custom rendering with `Field.Validity`

`Field.Validity` exposes the field's `ValidityState` via a render callback, allowing fully custom validation UI.

```tsx
<Field.Root name="password">
  <Field.Label>Password</Field.Label>
  <Field.Control type="password" required minLength={8} />
  <Field.Validity>
    {(state) => (
      <ul>
        <li>{state.valueMissing ? "❌" : "✅"} Required</li>
        <li>{state.tooShort ? "❌" : "✅"} At least 8 characters</li>
      </ul>
    )}
  </Field.Validity>
</Field.Root>
```

### React Hook Form + Zod integration

`Field.Root` accepts `isTouched`, `isDirty`, `invalid`, and `error` props that align with RHF's `fieldState` shape, so you can spread `fieldState` directly. Use `Form`'s `onSubmit` prop to connect RHF's `handleSubmit`.

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
            <Field.Control {...field} />
            <Field.Error>{fieldState.error?.message}</Field.Error>
          </Field.Root>
        )}
      />
      <button type="submit">Save</button>
    </Form>
  );
}
```

The Field context co-exists with RHF — it only drives accessibility wiring (`htmlFor`, `aria-describedby`) and visual state (`data-invalid`, `data-dirty`, `data-touched`) without interfering with RHF's value management or validation lifecycle.
