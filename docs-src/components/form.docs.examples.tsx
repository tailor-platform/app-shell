import { useId, useRef, useState } from "react";
import { Button, Combobox, Field, Fieldset, Form, Select, Text } from "@tailor-platform/app-shell";

export function BasicUsage() {
  const [submitted, setSubmitted] = useState<{ email: string } | null>(null);

  return (
    <Form<{ email: string }>
      noValidate
      className="max-w-sm space-y-4"
      onFormSubmit={(values) => setSubmitted(values)}
    >
      <Field.Root name="email">
        <Field.Label>Email</Field.Label>
        <Field.Control type="email" required />
        <Field.Description>We'll never share your email.</Field.Description>
        <Field.Error match="valueMissing">Email is required.</Field.Error>
        <Field.Error match="typeMismatch">Enter a valid email address.</Field.Error>
      </Field.Root>
      <Button type="submit">Save</Button>
      <Text.p role="status">
        {submitted ? `Submitted email: ${submitted.email}` : "No email submitted yet."}
      </Text.p>
    </Form>
  );
}

export function ExternalErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  function handleSubmit(values: { url: string }) {
    // Simulate an API validation response without sending a request.
    if (values.url === "https://taken.example.com") {
      setErrors({ url: "This homepage is already registered." });
      setSavedUrl(null);
      return;
    }

    setErrors({});
    setSavedUrl(values.url);
  }

  return (
    <Form<{ url: string }>
      noValidate
      errors={errors}
      onFormSubmit={handleSubmit}
      className="max-w-sm space-y-4"
    >
      <Field.Root name="url">
        <Field.Label>Homepage</Field.Label>
        <Field.Control type="url" required defaultValue="https://taken.example.com" />
        <Field.Description>Try another URL after the simulated server rejection.</Field.Description>
        <Field.Error />
      </Field.Root>
      <Button type="submit">Save homepage</Button>
      <Text.p role="status">
        {savedUrl ? `Saved homepage: ${savedUrl}` : "No homepage saved yet."}
      </Text.p>
    </Form>
  );
}

export function ProgrammaticValidation() {
  const actions = useRef<{ validate: () => void }>(null);

  return (
    <div className="max-w-sm space-y-4">
      <Form noValidate actionsRef={actions}>
        <Field.Root name="name">
          <Field.Label>Name</Field.Label>
          <Field.Control required />
          <Field.Error match="valueMissing">Name is required.</Field.Error>
        </Field.Root>
      </Form>
      <Button type="button" variant="outline" onClick={() => actions.current?.validate()}>
        Check
      </Button>
    </div>
  );
}

export function WithSelect() {
  const [submitted, setSubmitted] = useState<{ country: string } | null>(null);

  return (
    <Form<{ country: string }>
      noValidate
      className="max-w-sm space-y-4"
      onFormSubmit={(values) => setSubmitted(values)}
    >
      <Field.Root name="country">
        <Field.Label>Country</Field.Label>
        <Select items={["Japan", "United States"]} placeholder="Select a country" required />
        <Field.Description>The field supplies the label and submitted name.</Field.Description>
        <Field.Error match="valueMissing">Please select a country.</Field.Error>
      </Field.Root>
      <Button type="submit">Submit country</Button>
      <pre role="status" className="overflow-x-auto text-sm">
        {submitted ? JSON.stringify(submitted, null, 2) : "No country submitted yet."}
      </pre>
    </Form>
  );
}

export function SubmittedValues() {
  const [warehouses] = useState([
    { id: 1, name: "Tokyo warehouse" },
    { id: 2, name: "Osaka warehouse" },
  ]);
  const [submitted, setSubmitted] = useState<{ warehouse: string } | null>(null);

  return (
    <Form<{ warehouse: string }>
      noValidate
      className="max-w-sm space-y-4"
      onFormSubmit={(values) => setSubmitted(values)}
    >
      <Field.Root name="warehouse">
        <Field.Label>Warehouse</Field.Label>
        <Combobox
          items={warehouses}
          mapItem={(warehouse) => ({ label: warehouse.name, key: String(warehouse.id) })}
          itemToStringValue={(warehouse) => String(warehouse.id)}
          placeholder="Select a warehouse"
          required
        />
        <Field.Description>
          The warehouse name is displayed, but its ID is submitted.
        </Field.Description>
        <Field.Error match="valueMissing">Please select a warehouse.</Field.Error>
      </Field.Root>
      <Button type="submit">Submit warehouse</Button>
      <pre role="status" className="overflow-x-auto text-sm">
        {submitted ? JSON.stringify(submitted, null, 2) : "No warehouse submitted yet."}
      </pre>
    </Form>
  );
}

export function ExternalSubmit() {
  const formId = useId();
  const [submitted, setSubmitted] = useState<{ productName: string } | null>(null);

  return (
    <div className="max-w-sm space-y-4">
      <Button type="submit" form={formId}>
        Save product
      </Button>
      <Form<{ productName: string }>
        id={formId}
        noValidate
        onFormSubmit={(values) => setSubmitted(values)}
      >
        <Field.Root name="productName">
          <Field.Label>Product name</Field.Label>
          <Field.Control required />
          <Field.Error match="valueMissing">Product name is required.</Field.Error>
        </Field.Root>
      </Form>
      <pre role="status" className="overflow-x-auto text-sm">
        {submitted ? JSON.stringify(submitted, null, 2) : "No product submitted yet."}
      </pre>
    </div>
  );
}

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
