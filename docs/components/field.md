# Field

Form field with label, description, and error message.

## Parts

| Part                | Description                    |
| ------------------- | ------------------------------ |
| `Field.Root`        | Container with flex-col layout |
| `Field.Label`       | Label text                     |
| `Field.Control`     | Wraps the input control        |
| `Field.Error`       | Validation error message       |
| `Field.Description` | Help text                      |

## Example

```tsx
import { Field, Input } from "@tailor-platform/app-shell";

<Field.Root>
  <Field.Label>Email</Field.Label>
  <Field.Control render={<Input type="email" />} />
  <Field.Description>We'll never share your email.</Field.Description>
  <Field.Error>Please enter a valid email.</Field.Error>
</Field.Root>;
```
