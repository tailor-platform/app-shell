# Decision: `InputField` as the Field-aware text input

> Status: **Proposed — for discussion. Nothing is implemented.**
> Scope: the text-input story inside forms: `Input`, `Field.Control`, and a proposed `InputField`. This does not cover the dev warning and docs for platform-planning#1977, which ship separately and stand on their own.

## Context

Tracking issue: tailor-inc/platform-planning#1977, split out of tailor-inc/platform-planning#1670.

#1977 reports that `<Field.Control render={<Select />} />` renders a double frame. While looking for the cause, a wider inconsistency turned up in how AppShell's form controls connect to `Field.Root`.

### Every control except `Input` connects to `Field.Root` by itself

| Control                                          | How it joins `Field.Root`                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `Select`, `Combobox`, `Autocomplete`, `Checkbox` | Built on a Base UI primitive (`BaseSelect.Root`, …) that reads the Field context and registers itself.                          |
| `Textarea`                                       | Wraps `BaseField.Control` rendered as a `<textarea>`.                                                                           |
| `DateField`, `DatePicker`, `DateRangePicker`     | Hand-written bridge (`use-date-field-bridge.ts`) over Base UI internals and a hidden proxy input. Same result for the consumer. |
| `Input`                                          | **None.** It renders a native `<input>`.                                                                                        |

When any of these controls is placed directly under `Field.Root`, it gets label association (`htmlFor`), `aria-describedby`, `disabled`, invalid state, and value registration for `Form`'s `onFormSubmit`. `Input` gets none of that.

### AppShell has two styled text inputs

`Field.Control` and `Input` apply the same `inputBaseClasses`, but each one has something the other lacks:

|                                         | `Field.Control` | `Input` |
| --------------------------------------- | --------------- | ------- |
| Connects to `Field.Root`                | yes             | no      |
| Toolbar roving focus (`useToolbarItem`) | no              | yes     |
| Works standalone, outside a form        | yes             | yes     |

So the rule a consumer has to learn is: "a text input goes through `Field.Control`; every other control must **not**." That is the analogy that leads people to `<Field.Control render={<Select />} />` and to `<Field.Control render={<Input />} />`. The second one is already called out as a mistake in `docs/patterns/form-modal.md`.

```tsx
// ✅ Select: wired automatically
<Field.Root name="country">
  <Field.Label>Country</Field.Label>
  <Select items={countries} />
  <Field.Error />
</Field.Root>

// ❌ Input: looks identical, nothing is wired
<Field.Root name="email">
  <Field.Label>Email</Field.Label>     {/* htmlFor points at nothing */}
  <Input type="email" required />      {/* no disabled, no aria-describedby, no data-invalid, not registered */}
  <Field.Error match="valueMissing" /> {/* never fires */}
</Field.Root>

// ✅ What works today: Field.Control *is* the text input. Input is not involved.
<Field.Root name="email">
  <Field.Label>Email</Field.Label>
  <Field.Control type="email" required />
</Field.Root>

// ❌ The analogy that follows: two frames
<Field.Control render={<Input />} />
<Field.Control render={<Select items={countries} />} /> // #1977
```

### `Field.Control` is a wiring primitive styled as an input

In Base UI, `Field.Control` is a logical primitive, not a visual element. It connects an element to `Field.Root` (label, description, validation, value registration) and has no styling of its own. Base UI's `Input` is literally `<Field.Control>` re-exported. The other use of `Field.Control` is to wire in an element that is not a Base UI control, through `render`: a native `<textarea>` or `<select>`, or an input the consumer built.

AppShell applied `inputBaseClasses` on top of `Field.Control`, and that was a mistake. Not every element it wires needs the text-input visual treatment: the classes reach whatever is passed to `render`, which is the cause of #1977's double frame. Styling it also blurs what each component is for. `Input` is the visual text input. `Field.Control` is the link between an element and its field. Once `Field.Control` looks like an input, it competes with `Input` for the same job.

### How `Input` is used today

On `main` (2026-10-21), no example, doc, or core component puts `<Input>` inside a `Field.Root`. Every usage is standalone: toolbar and data-table search boxes, column settings, editable cells, the command palette, and dialog/sheet examples that hold the value in `useState`. Consumer apps have not been scanned yet (see open questions).

## Options

### A. Rewire `Input` in place

Re-implement `Input` on `BaseField.Control`, the same way `Textarea` is built.

```tsx
type InputProps = Omit<React.ComponentProps<typeof BaseField.Control>, "render" | "className"> & {
  className?: string;
};

function Input({ className, ref: forwardedRef, ...props }: InputProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  useToolbarItem(ref, { handlesDirectionalKeys: true });
  return (
    <BaseField.Control
      ref={mergeRefs(ref, forwardedRef)}
      data-slot="input"
      className={cn(inputBaseClasses, /* data-invalid + aria-invalid */ className)}
      {...props}
    />
  );
}
```

Outside a `Field.Root`, nothing changes. Base UI's Field context has a default value, so `Field.Control` with no `Field.Root` above it is a plain `<input>`: no field wiring and no `Form` registration (`Textarea` already relies on this).

This is the smallest change, but it is **breaking in a minor release**:

```tsx
// ⚠️ 1. Type: InputProps stops being plain <input> props (it gains onValueChange)
function MyInput(props: InputProps) {
  return <input {...props} />; // 💥 TS error; at runtime React warns about an unknown DOM prop
}

// ⚠️ 2. Behaviour: an Input inside a Field.Root starts registering
<Field.Root name="a" disabled>
  <Input name="b" />            // was enabled and named "b"; now disabled, and "a" wins
</Field.Root>
// - onFormSubmit values now include the field. Code that mirrored it in useState gets it twice.
// - required / type="email" now run Field validation and can block submit.

// ⚠️ 3. File inputs: Input ships file: classes, so type="file" is supported
<Field.Root name="avatar"><Input type="file" /></Field.Root>
// Field.Control reads input.value, giving "C:\fakepath\x.png" instead of a File.

// ⚠️ 4. DOM: new data-valid / data-dirty / data-touched / data-filled / data-focused attributes
```

### B. Add `InputField`; deprecate `Input` for the next major (proposed)

Add a new component that is Field-aware **and** toolbar-aware, and works standalone. That is option A's implementation under a new name. `Input` stays as it is, marked `@deprecated`, and is removed in the next major (milestone "AppShell v2.0.0").

```tsx
// New: one text input that behaves like every other AppShell control
<Field.Root name="email">
  <Field.Label>Email</Field.Label>
  <InputField type="email" required />
  <Field.Error match="valueMissing">Email is required.</Field.Error>
</Field.Root>

// Standalone and in a toolbar it works exactly like Input does today
<Toolbar.Row>
  <InputField placeholder="Search orders" />
</Toolbar.Row>
```

```tsx
// Input: unchanged behaviour, deprecation notice only
/**
 * @deprecated Use `InputField`. It works standalone and also connects to `Field.Root`.
 * `Input` will be removed in v2.0.0.
 */
function Input(props: InputProps) {
  /* unchanged */
}
```

What this gives us:

- **Nothing breaks now.** All four risks from option A apply only to code that opts in to `InputField`, and they are behaviours that code wants.
- **One rule for forms:** every AppShell control goes directly under `Field.Root`. `Field.Control` is only needed to wire in native elements (`render={<textarea />}`-style) and consumer-built inputs.
- **The name has a precedent.** `DateField` already means "a control that works standalone and connects to `Field.Root` when inside one".

Costs:

- For one major cycle there are three text inputs: `Input`, `InputField`, `Field.Control`. The docs have to point clearly at `InputField`.
- Internal usages (about 20 in `data-table`, `command-palette`, `sidebar`, and docs examples) move to `InputField` before v2.0.0.
- `type="file"` (risk 3) still needs an answer before `InputField` ships: either it does not register its value, or file inputs are out of scope for it.

### C. Docs and dev warnings only

Keep both components. Document the rule ("text input → `Field.Control`; everything else → directly under `Field.Root`") and warn on the wrong compositions. This is what #1977 does now. It reduces the mistakes but keeps the exception that causes them.

## Proposal

Ship C now (#1977). Discuss B as the follow-up.

## Open questions

1. **Should `Field.Control` keep the input styling?** Once `InputField` exists, `Field.Control`'s only job is to link a native or consumer-built input to our fields. Is it still appropriate for it to carry `inputBaseClasses`? The consumer's input brings its own look, so the classes would fight it or need overriding. The alternative is to make `Field.Control` unstyled, like Base UI's. Removing the styling is breaking too, so it would need the same major.
2. **Naming.** `InputField` versus `TextField`. `TextField` reads better for `type="text"`, but `type` also covers email, number, password, and so on, and `InputField` matches the `<input>` element and `DateField`.
3. **Consumer usage.** Scan consumer repos (the same way the PR #350 scroll audit did) for `<Input>` inside `Field.Root`, and for `InputProps` passed to a native `<input>`. This sizes the deprecation and tells us whether option A is ever safe.
4. **`type="file"` under `InputField`.** Opt out of value registration, or make it unsupported?
