import { Field, Textarea } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return <Textarea placeholder="Add a note…" />;
}

export function Height() {
  return <Textarea aria-label="Incident log" rows={8} placeholder="Paste the incident log…" />;
}

export function Disabled() {
  return <Textarea aria-label="Unavailable note" value="Read-only value" disabled />;
}

export function WithField() {
  return (
    <Field.Root name="description">
      <Field.Label>Description</Field.Label>
      <Textarea placeholder="What changed?" />
      <Field.Description>Optional — visible to the whole team.</Field.Description>
    </Field.Root>
  );
}
