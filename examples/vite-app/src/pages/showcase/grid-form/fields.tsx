import { Checkbox, Combobox, Field, Grid, Select, Textarea } from "@tailor-platform/app-shell";
import { BUYERS, COUNTRIES, DEPARTMENTS } from "./data";

// 🔽 Ownership & notes
export function BillingFields() {
  return (
    <>
      <Field.Root name="buyer">
        <Field.Label required>Buyer</Field.Label>
        <Combobox items={BUYERS} defaultValue="Hanna Suzuki" required />
      </Field.Root>
      <Field.Root name="department">
        <Field.Label>Department</Field.Label>
        <Select items={DEPARTMENTS} placeholder="Select department" />
      </Field.Root>
      <Field.Root name="costCenter">
        <Field.Label>Cost center</Field.Label>
        <Field.Control placeholder="CC-4100" />
      </Field.Root>
      <Grid.Item colSpan="full">
        <Field.Root name="internalNotes">
          <Field.Label>Internal notes</Field.Label>
          <Textarea rows={3} placeholder="Only visible to your team" />
          <Field.Description>Not printed on the purchase order.</Field.Description>
        </Field.Root>
      </Grid.Item>
      <Grid.Item colSpan="full">
        <Field.Root name="sendOnConfirm">
          <Checkbox label="Email the PO to the supplier when it is confirmed" defaultChecked />
        </Field.Root>
      </Grid.Item>
    </>
  );
}

// 🔽 Supplier master fields (quick create)
export function NewSupplierFields() {
  return (
    <>
      <Grid.Item colSpan="full">
        <Field.Root name="name">
          <Field.Label required>Supplier name</Field.Label>
          <Field.Control required placeholder="e.g. Kansai Textile Co." />
          <Field.Error match="valueMissing">Enter a supplier name.</Field.Error>
        </Field.Root>
      </Grid.Item>
      <Field.Root name="code">
        <Field.Label required>Code</Field.Label>
        <Field.Control required placeholder="SUP-0042" />
        <Field.Error match="valueMissing">Enter a code.</Field.Error>
      </Field.Root>
      <Field.Root name="country">
        <Field.Label>Country</Field.Label>
        <Select items={COUNTRIES} placeholder="Select country" />
      </Field.Root>
      <Field.Root name="email">
        <Field.Label>Email</Field.Label>
        <Field.Control type="email" placeholder="orders@supplier.com" />
        <Field.Error match="typeMismatch">Enter a valid email.</Field.Error>
      </Field.Root>
      <Field.Root name="phone">
        <Field.Label>Phone</Field.Label>
        <Field.Control type="tel" placeholder="+81 6-1234-5678" />
      </Field.Root>
    </>
  );
}

// 🔽 Reusable address block: a nested Grid reflows inside whatever span it gets
export function AddressFields({ prefix }: { prefix: string }) {
  return (
    <Grid maxColumns={2} gapX={6} gapY={4}>
      <Grid.Item colSpan="full">
        <Field.Root name={`${prefix}.street`}>
          <Field.Label required>Street</Field.Label>
          <Field.Control required placeholder="1-2-3 Umeda" />
        </Field.Root>
      </Grid.Item>
      <Field.Root name={`${prefix}.city`}>
        <Field.Label required>City</Field.Label>
        <Field.Control required placeholder="Osaka" />
      </Field.Root>
      <Field.Root name={`${prefix}.postcode`}>
        <Field.Label>Postcode</Field.Label>
        <Field.Control placeholder="530-0001" />
      </Field.Root>
      <Grid.Item colSpan="full">
        <Field.Root name={`${prefix}.country`}>
          <Field.Label required>Country</Field.Label>
          <Select items={COUNTRIES} defaultValue="Japan" required />
        </Field.Root>
      </Grid.Item>
    </Grid>
  );
}
