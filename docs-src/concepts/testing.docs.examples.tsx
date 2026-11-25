import { Field } from "@tailor-platform/app-shell";

export function LabeledEmail() {
  return (
    <Field.Root name="email">
      <Field.Label>Email</Field.Label>
      <Field.Control type="email" />
      <Field.Description>Used for order updates.</Field.Description>
    </Field.Root>
  );
}
