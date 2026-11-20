import {
  Attachment,
  Autocomplete,
  Checkbox,
  Combobox,
  DateField,
  DatePicker,
  DateRangePicker,
  Field,
  Fieldset,
  Grid,
  Select,
  Textarea,
  useAttachment,
  type AttachmentItem,
} from "@tailor-platform/app-shell";
import { BUYERS, CARRIERS, DEPARTMENTS, PAYMENT_TERMS, SUPPLIERS } from "./data";
import { FormSection } from "./form-section";

// 🔽 A full edit form with every control type, Grid-composed. Used in both the
// modal (Dialog size="lg", about 670px of body) and the sheet (size="lg"): the
// grid shows two columns in each, and drops to one on a narrow viewport,
// without any change to this markup.

// 🧪 Dummy Data: Replace with real data later
const TAGS = ["Seasonal", "Reorder", "Sample", "Wholesale", "Drop ship"];

// 🧪 Dummy Data: Replace with real data later
const INITIAL_FILES: AttachmentItem[] = [
  { id: "quote", fileName: "Kansai-quote-Q4.pdf", mimeType: "application/pdf" },
  { id: "spec", fileName: "Hoodie-spec-sheet.xlsx", mimeType: "application/vnd.ms-excel" },
];

export function AllFieldTypes() {
  // The hook lives here, inside the overlay, so closing it resets the files.
  const files = useAttachment({
    initialItems: INITIAL_FILES,
    accept: ".pdf,.xlsx,.csv,image/*",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* 🔽 Text and numbers */}
      <FormSection
        variant="plain"
        title="Details"
        description="Text, numbers and read-only values."
      >
        <Field.Root name="name">
          <Field.Label required>Item name</Field.Label>
          <Field.Control required placeholder="Cotton Wreath Hoodie" />
          <Field.Error match="valueMissing">Enter a name.</Field.Error>
        </Field.Root>
        <Field.Root name="email">
          <Field.Label>Supplier email</Field.Label>
          <Field.Control type="email" placeholder="orders@kansai-textile.jp" />
          <Field.Error match="typeMismatch">Enter a valid email address.</Field.Error>
        </Field.Root>
        <Field.Root name="quantity">
          <Field.Label required>Quantity</Field.Label>
          <Field.Control type="number" min={1} required defaultValue={120} />
          <Field.Description>Units, minimum 1.</Field.Description>
        </Field.Root>
        <Field.Root name="unitPrice">
          <Field.Label>Unit price (USD)</Field.Label>
          <Field.Control type="number" step="0.01" min={0} placeholder="38.50" />
        </Field.Root>
      </FormSection>

      {/* 🔽 Choices */}
      <FormSection variant="plain" title="Choices" description="Select, Combobox and Autocomplete.">
        <Field.Root name="paymentTerms">
          <Field.Label required>Payment terms</Field.Label>
          <Select items={PAYMENT_TERMS} placeholder="Select terms" required />
        </Field.Root>
        <Field.Root name="departments">
          <Field.Label>Departments</Field.Label>
          <Select items={DEPARTMENTS} multiple placeholder="Select departments" />
          <Field.Description>Select, several at once.</Field.Description>
        </Field.Root>
        <Field.Root name="supplier">
          <Field.Label required>Supplier</Field.Label>
          <Combobox items={SUPPLIERS} placeholder="Search suppliers" required />
        </Field.Root>
        <Field.Root name="tags">
          <Field.Label>Tags</Field.Label>
          <Combobox items={TAGS} multiple placeholder="Add tags" />
        </Field.Root>
        <Field.Root name="carrier">
          <Field.Label>Carrier</Field.Label>
          <Autocomplete items={CARRIERS} placeholder="Type or pick a carrier" />
        </Field.Root>
        <Field.Root name="buyer">
          <Field.Label>Buyer</Field.Label>
          <Select items={BUYERS} defaultValue="Hanna Suzuki" disabled />
          <Field.Description>Disabled: set from your account.</Field.Description>
        </Field.Root>
        <Grid.Item colSpan="full">
          <Fieldset.Root className="flex flex-col gap-2">
            <Fieldset.Legend>Notify on receipt</Fieldset.Legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Checkbox name="notifyBuyer" label="Buyer" defaultChecked />
              <Checkbox name="notifyWarehouse" label="Warehouse" defaultChecked />
              <Checkbox name="notifyFinance" label="Finance" />
              <Checkbox name="notifySupplier" label="Supplier" />
            </div>
          </Fieldset.Root>
        </Grid.Item>
        <Grid.Item colSpan="full">
          <Field.Root name="inspection">
            <Checkbox label="Hold for quality inspection before putaway" />
          </Field.Root>
        </Grid.Item>
      </FormSection>

      {/* 🔽 Dates */}
      <FormSection
        variant="plain"
        title="Dates"
        description="DateField, DatePicker and DateRangePicker."
      >
        <Field.Root name="orderDate">
          <Field.Label required>Order date</Field.Label>
          <DateField isRequired />
        </Field.Root>
        <Field.Root name="eta">
          <Field.Label>Expected delivery</Field.Label>
          <DatePicker />
        </Field.Root>
        <Grid.Item colSpan={2}>
          <Field.Root name="window">
            <Field.Label>Delivery window</Field.Label>
            <DateRangePicker />
            <Field.Description>The dock accepts the goods on these dates.</Field.Description>
          </Field.Root>
        </Grid.Item>
      </FormSection>

      {/* 🔽 Files: drag and drop, or click to upload */}
      <FormSection
        variant="plain"
        title="Documents"
        description="Drop files here or click to upload. Quotes, spec sheets, delivery notes."
      >
        <Grid.Item colSpan="full">
          <Attachment
            {...files.props}
            uploadLabel="Upload documents"
            uploadHint="PDF, Excel, CSV or images"
          />
        </Grid.Item>
      </FormSection>

      {/* 🔽 Notes */}
      <FormSection variant="plain" title="Notes">
        <Grid.Item colSpan="full">
          <Field.Root name="notes">
            <Field.Label>Notes</Field.Label>
            <Textarea rows={3} placeholder="Anything the warehouse should know" />
            <Field.Description>Shown on the receiving note.</Field.Description>
          </Field.Root>
        </Grid.Item>
      </FormSection>
    </div>
  );
}
