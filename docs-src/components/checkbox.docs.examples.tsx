import { Checkbox, Field } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return <Checkbox label="Subscribe to updates" />;
}

export function BoxOnly() {
  return <Checkbox aria-label="Select row" />;
}

export function Disabled() {
  return <Checkbox label="Unavailable option" disabled />;
}

export function WithField() {
  return (
    <Field.Root name="acceptTerms" error={{ message: "You must accept the terms." }}>
      <Checkbox label="I accept the terms and conditions" />
      <Field.Error>You must accept the terms.</Field.Error>
    </Field.Root>
  );
}
