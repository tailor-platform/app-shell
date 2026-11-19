import { Combobox, DatePicker, Field, Select, Textarea } from "@tailor-platform/app-shell";

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
