import {
  Button,
  Combobox,
  Field,
  Form,
  FormLayout,
  Select,
  Textarea,
} from "@tailor-platform/app-shell";

const SUPPLIERS = ["Acme Industrial Supplies", "Kansai Textile Co.", "Northwind Fabrics"];
const WAREHOUSES = ["Tokyo DC", "Osaka DC", "Nagoya DC"];

export function BasicUsage() {
  return (
    <Form id="supplier-form" onFormSubmit={(values) => console.log(values)}>
      <FormLayout columns={2}>
        <Field.Root name="name" span="full">
          <Field.Label required>Supplier name</Field.Label>
          <Field.Control required />
        </Field.Root>
        <Field.Root name="code">
          <Field.Label required>Code</Field.Label>
          <Field.Control required />
        </Field.Root>
        <Field.Root name="email">
          <Field.Label>Email</Field.Label>
          <Field.Control type="email" />
        </Field.Root>
        <Field.Root name="notes" span="full">
          <Field.Label>Notes</Field.Label>
          <Textarea rows={3} />
        </Field.Root>
      </FormLayout>
    </Form>
  );
}

export function Sections() {
  return (
    <Form id="po-form" onFormSubmit={(values) => console.log(values)}>
      <FormLayout columns={2}>
        <FormLayout.Section title="Supplier" description="Who you are buying from.">
          <Field.Root name="supplier">
            <Field.Label required>Supplier</Field.Label>
            <Combobox items={SUPPLIERS} placeholder="Search suppliers" required />
          </Field.Root>
          <Field.Root name="reference">
            <Field.Label>Supplier reference</Field.Label>
            <Field.Control />
          </Field.Root>
        </FormLayout.Section>
        <FormLayout.Section title="Delivery" description="Where the goods arrive.">
          <Field.Root name="shipTo">
            <Field.Label required>Ship to</Field.Label>
            <Select items={WAREHOUSES} placeholder="Select warehouse" required />
          </Field.Root>
          <Field.Root name="instructions" span="full">
            <Field.Label>Delivery instructions</Field.Label>
            <Textarea rows={3} />
          </Field.Root>
        </FormLayout.Section>
        <FormLayout.Actions sticky>
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </FormLayout.Actions>
      </FormLayout>
    </Form>
  );
}
