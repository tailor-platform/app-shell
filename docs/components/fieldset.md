# Fieldset

Groups related form fields with a legend.

## Parts

| Part              | Description        |
| ----------------- | ------------------ |
| `Fieldset.Root`   | Fieldset container |
| `Fieldset.Legend` | Legend text        |

## Example

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
</Fieldset.Root>;
```
