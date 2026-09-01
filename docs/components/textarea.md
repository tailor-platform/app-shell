---
title: Textarea
description: Styled multi-line text input sized by rows, with automatic Field / React Hook Form integration
---

# Textarea

The `Textarea` component is a styled multi-line text input. It wraps Base UI's field control rendered as a `<textarea>`, so it works with [`Field`](./form.md) and React Hook Form the same way `Input`, `Checkbox`, and `Select` do — dropped inside a `Field.Root` it inherits label association, `aria-describedby`, `disabled`, and the invalid (error) state automatically.

Unlike `Input`, it has no fixed height: `rows` sets the visible line count (floored at `min-h-16`) and the user can drag the box taller, so long text stays readable instead of scrolling inside a single-line window.

## Import

```tsx
import { Textarea } from "@tailor-platform/app-shell";
```

## Basic Usage

```tsx
<Textarea placeholder="Add a note…" />
```

## Props

Accepts Base UI's field-control props plus the standard HTML `<textarea>` props, minus `cols` and `wrap` — the control is always `w-full`, so `cols` could never affect its width, and every `wrap` value depends on `cols` being set. The most common:

| Prop            | Type                                    | Default | Description                                             |
| --------------- | --------------------------------------- | ------- | ------------------------------------------------------- |
| `value`         | `string`                                | -       | Controlled value.                                       |
| `defaultValue`  | `string`                                | -       | Initial value when uncontrolled.                        |
| `onChange`      | `(event) => void`                       | -       | Native change handler.                                  |
| `onValueChange` | `(value: string, eventDetails) => void` | -       | Called with the next string value.                      |
| `rows`          | `number`                                | -       | Visible line count — the height knob.                   |
| `placeholder`   | `string`                                | -       | Placeholder text.                                       |
| `disabled`      | `boolean`                               | `false` | Disables the control.                                   |
| `required`      | `boolean`                               | `false` | Marks the control required for native/Field validation. |
| `readOnly`      | `boolean`                               | `false` | Renders the value without allowing edits.               |
| `name`          | `string`                                | -       | Field name for native form submission.                  |
| `className`     | `string`                                | -       | Additional CSS classes.                                 |

## Examples

### Controlled

```tsx
const [note, setNote] = useState("");

<Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />;
```

### Height

`rows` sets the visible line count, and the user can drag the box taller for a long value.

`min-h-16` (64px) is a hard floor, so `rows={1}` and `rows={2}` both render at 64px — `rows` only starts moving the height from 3 up. There is no supported way to go below the floor.

```tsx
<Textarea rows={8} placeholder="Paste the incident log…" />
```

> The box does not auto-grow as you type. `field-sizing: content` would do that, but the browser then ignores `rows` — leaving height settable only through a `min-h-*` utility, which a consuming app can't rely on because `astw:` utilities exist only if they were compiled into this package's CSS.

### Disabled

```tsx
<Textarea value="Read-only value" disabled />
```

## Use With Field

Placed inside a `Field.Root`, `Textarea` picks up the field's label, description, and invalid/disabled state automatically — no `error` prop of its own.

```tsx
<Field.Root name="description">
  <Field.Label>Description</Field.Label>
  <Textarea placeholder="What changed?" />
  <Field.Description>Optional — visible to the whole team.</Field.Description>
</Field.Root>
```

## React Hook Form

Drive it with a `Controller`. Spreading `field` wires `value`/`onChange`/`onBlur`, and spreading `fieldState` onto `Field.Root` wires the error/invalid state.

```tsx
import { useForm, Controller } from "react-hook-form";
import { Field, Textarea } from "@tailor-platform/app-shell";

const { control } = useForm({ defaultValues: { description: "" } });

<Controller
  name="description"
  control={control}
  rules={{ required: "Description is required." }}
  render={({ field, fieldState }) => (
    <Field.Root name={field.name} {...fieldState}>
      <Field.Label>Description</Field.Label>
      <Textarea {...field} />
      <Field.Error match={fieldState.invalid}>{fieldState.error?.message}</Field.Error>
    </Field.Root>
  )}
/>;
```

## TypeScript

```typescript
import { type TextareaProps } from "@tailor-platform/app-shell";
```

## Related Components

- [Input](./input.md) - Single-line text input with the same styling and `Field` integration
- [Form](./form.md) - Form root and `Field` composition
- [Button](./button.md) - Pair with a textarea in a composer action row
