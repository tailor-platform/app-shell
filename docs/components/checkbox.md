---
title: Checkbox
description: Styled checkbox for boolean form fields, with indeterminate state and automatic Field / React Hook Form integration
---

# Checkbox

The `Checkbox` component is a styled control for boolean fields. It wraps Base UI's checkbox, so it works with [`Field`](./form.md) and React Hook Form the same way `Input`, `Select`, and `Combobox` do — dropped inside a `Field.Root` it inherits label association, `aria-describedby`, `disabled`, and the invalid (error) state automatically.

## Import

```tsx
import { Checkbox } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Checkbox label="Subscribe to updates" />
```

Omit `label` to render just the box — useful for a table row-select cell (pass `aria-label`) or when a `Field.Label` sibling supplies the text.

```tsx
<Checkbox aria-label="Select row" />
```

## Props

Accepts all Base UI `Checkbox.Root` props, plus `label`. The most common:

| Prop              | Type                                  | Default | Description                                                                           |
| ----------------- | ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `label`           | `React.ReactNode`                     | -       | Inline label rendered next to the box (wraps both in a `<label>`). Omit for box-only. |
| `checked`         | `boolean`                             | -       | Controlled checked state.                                                             |
| `defaultChecked`  | `boolean`                             | `false` | Initial checked state when uncontrolled.                                              |
| `onCheckedChange` | `(checked: boolean, details) => void` | -       | Called with the next boolean state.                                                   |
| `indeterminate`   | `boolean`                             | `false` | Renders the "partially selected" (mixed) state.                                       |
| `disabled`        | `boolean`                             | `false` | Disables the control.                                                                 |
| `required`        | `boolean`                             | `false` | Marks the control as required for native/Field validation.                            |
| `name`            | `string`                              | -       | Field name for native form submission.                                                |
| `value`           | `string`                              | -       | Submitted value when checked (native forms).                                          |
| `inputRef`        | `React.Ref<HTMLInputElement>`         | -       | Ref to the hidden native input (use for React Hook Form's `field.ref`).               |
| `className`       | `string`                              | -       | Applied to the outer element — the `<label>` when `label` is set, else the box.       |

## Examples

### Controlled

```tsx
const [checked, setChecked] = useState(false);

<Checkbox label="Enable notifications" checked={checked} onCheckedChange={setChecked} />;
```

### Indeterminate ("select all")

```tsx
<Checkbox
  aria-label="Select all rows"
  checked={allSelected}
  indeterminate={someSelected && !allSelected}
  onCheckedChange={(checked) => (checked ? selectAll() : clearAll())}
/>
```

### Disabled

```tsx
<Checkbox label="Unavailable option" disabled />
```

## Use With Field

Placed inside a `Field.Root`, `Checkbox` picks up the field's invalid and disabled state automatically — no `error` prop of its own. Use the inline `label` for the checkbox text and `Field.Error` for the message below it.

```tsx
<Field.Root name="acceptTerms" error={{ message: "You must accept the terms." }}>
  <Checkbox label="I accept the terms and conditions" />
  <Field.Error />
</Field.Root>
```

## React Hook Form

Drive the checkbox with a `Controller`. `onCheckedChange` hands React Hook Form a boolean directly, and spreading `fieldState` onto `Field.Root` wires the error/invalid state.

```tsx
import { useForm, Controller } from "react-hook-form";

function TermsForm() {
  const { control, handleSubmit } = useForm({ defaultValues: { acceptTerms: false } });

  return (
    <Form onSubmit={handleSubmit((data) => save(data))}>
      <Controller
        name="acceptTerms"
        control={control}
        rules={{ required: "You must accept the terms." }}
        render={({ field, fieldState }) => (
          <Field.Root name={field.name} {...fieldState}>
            <Checkbox
              label="I accept the terms and conditions"
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
            />
            <Field.Error />
          </Field.Root>
        )}
      />
      <button type="submit">Save</button>
    </Form>
  );
}
```

## TypeScript

```typescript
import { type CheckboxProps } from "@tailor-platform/app-shell";
```

## Related Components

- [Form, Field, and Fieldset](./form.md) — Checkbox integrates with `Field` for labels, errors, and validation.
- [Input](./input.md) — Text input counterpart.
