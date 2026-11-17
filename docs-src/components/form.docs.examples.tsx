import { Field, Fieldset } from "@tailor-platform/app-shell";

export function CustomValidation() {
  return (
    <Field.Root name="password" validationMode="onChange">
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
  );
}

export function BillingFieldset() {
  return (
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
  );
}
