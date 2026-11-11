import {
  Checkbox,
  Combobox,
  DatePicker,
  Field,
  Select,
  Textarea,
} from "@tailor-platform/app-shell";

// One set of purchase-order fields, reused by every template so the only
// thing that changes between them is the container and the column count.

// 🧪 Dummy Data: Replace with real data later
export const SUPPLIERS = [
  "Acme Industrial Supplies",
  "Kansai Textile Co.",
  "Northwind Fabrics",
  "Osaka Trim & Notions",
  "Pacific Packaging Ltd.",
];
// 🧪 Dummy Data: Replace with real data later
export const WAREHOUSES = ["Tokyo DC", "Osaka DC", "Nagoya DC", "Austin Main Warehouse"];
// 🧪 Dummy Data: Replace with real data later
export const CURRENCIES = ["USD", "EUR", "GBP", "JPY"];
// 🧪 Dummy Data: Replace with real data later
export const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 60", "Due on receipt"];
// 🧪 Dummy Data: Replace with real data later
export const INCOTERMS = ["EXW", "FOB", "CIF", "DAP", "DDP"];
// 🧪 Dummy Data: Replace with real data later
export const CARRIERS = ["Yamato Transport", "Sagawa Express", "DHL", "FedEx Freight"];
// 🧪 Dummy Data: Replace with real data later
export const BUYERS = ["Hanna Suzuki", "Kenji Mori", "Priya Nair", "Sam Taylor"];
// 🧪 Dummy Data: Replace with real data later
export const DEPARTMENTS = ["Merchandising", "Operations", "Wholesale", "Retail"];
// 🧪 Dummy Data: Replace with real data later
export const COUNTRIES = ["Japan", "United States", "United Kingdom", "Vietnam", "Portugal"];

// 🔽 Supplier fields
export function SupplierFields() {
  return (
    <>
      <Field.Root name="supplier">
        <Field.Label required>Supplier</Field.Label>
        <Combobox items={SUPPLIERS} placeholder="Search suppliers" required />
        <Field.Error match="valueMissing">Choose a supplier.</Field.Error>
      </Field.Root>
      <Field.Root name="supplierReference">
        <Field.Label>Supplier reference</Field.Label>
        <Field.Control placeholder="e.g. SO-88213" />
      </Field.Root>
      <Field.Root name="currency">
        <Field.Label required>Currency</Field.Label>
        <Select items={CURRENCIES} defaultValue="USD" required />
      </Field.Root>
      <Field.Root name="paymentTerms">
        <Field.Label>Payment terms</Field.Label>
        <Select items={PAYMENT_TERMS} defaultValue="Net 30" />
      </Field.Root>
    </>
  );
}

// 🔽 Delivery fields
export function DeliveryFields({ withInstructions = true }: { withInstructions?: boolean }) {
  return (
    <>
      <Field.Root name="shipTo">
        <Field.Label required>Ship to</Field.Label>
        <Select items={WAREHOUSES} placeholder="Select warehouse" required />
        <Field.Error match="valueMissing">Choose a warehouse.</Field.Error>
      </Field.Root>
      <Field.Root name="expectedDelivery">
        <Field.Label required>Expected delivery</Field.Label>
        <DatePicker isRequired />
      </Field.Root>
      <Field.Root name="incoterms">
        <Field.Label>Incoterms</Field.Label>
        <Select items={INCOTERMS} placeholder="Select incoterms" />
      </Field.Root>
      <Field.Root name="carrier">
        <Field.Label>Carrier</Field.Label>
        <Combobox items={CARRIERS} placeholder="Search carriers" />
      </Field.Root>
      {withInstructions && (
        <Field.Root name="deliveryInstructions">
          <Field.Label>Delivery instructions</Field.Label>
          <Textarea rows={3} placeholder="Dock hours, contact on arrival, pallet limits…" />
        </Field.Root>
      )}
    </>
  );
}

// 🔽 Billing & notes fields
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
      <Field.Root name="internalNotes">
        <Field.Label>Internal notes</Field.Label>
        <Textarea rows={3} placeholder="Only visible to your team" />
        <Field.Description>Not printed on the purchase order.</Field.Description>
      </Field.Root>
      <Field.Root name="sendOnConfirm" span="full">
        <Checkbox label="Email the PO to the supplier when it is confirmed" defaultChecked />
      </Field.Root>
    </>
  );
}

// 🔽 Supplier master fields (quick create)
export function NewSupplierFields() {
  return (
    <>
      <Field.Root name="name" span="full">
        <Field.Label required>Supplier name</Field.Label>
        <Field.Control required placeholder="e.g. Kansai Textile Co." />
        <Field.Error match="valueMissing">Enter a supplier name.</Field.Error>
      </Field.Root>
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
