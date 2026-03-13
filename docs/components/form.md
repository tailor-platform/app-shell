# Form

Form container with flex-col layout and gap.

## Example

```tsx
import { Form, Field, Input, Button } from "@tailor-platform/app-shell";

<Form onSubmit={handleSubmit}>
  <Field.Root>
    <Field.Label>Name</Field.Label>
    <Field.Control render={<Input />} />
  </Field.Root>
  <Button type="submit">Submit</Button>
</Form>;
```
