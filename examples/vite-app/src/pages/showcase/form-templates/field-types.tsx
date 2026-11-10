import * as React from "react";
import {
  Attachment,
  Autocomplete,
  Button,
  Checkbox,
  Combobox,
  DateField,
  DatePicker,
  DateRangePicker,
  Field,
  Fieldset,
  Form,
  FormLayout,
  Select,
  Text,
  Textarea,
  useAttachment,
  useToast,
  type AttachmentItem,
} from "@tailor-platform/app-shell";
import { BUYERS, CARRIERS, DEPARTMENTS, PAYMENT_TERMS, SUPPLIERS } from "./fields";

// 🔽 Field types — every control AppShell has, inside one FormLayout, so you
// can see how each one sits in the grid and how far it spans by default.

// 🧪 Dummy Data: Replace with real data later
const TAGS = ["Seasonal", "Reorder", "Sample", "Wholesale", "Drop ship"];

// 🧪 Dummy Data: Replace with real data later
const INITIAL_FILES: AttachmentItem[] = [
  { id: "quote", fileName: "Kansai-quote-Q4.pdf", mimeType: "application/pdf" },
  { id: "spec", fileName: "Hoodie-spec-sheet.xlsx", mimeType: "application/vnd.ms-excel" },
];

export function FieldTypes() {
  const toast = useToast();
  // A server-side error (e.g. a duplicate) shown until the user edits the value.
  const [taxIdTaken, setTaxIdTaken] = React.useState(true);
  const files = useAttachment({
    initialItems: INITIAL_FILES,
    accept: ".pdf,.xlsx,.csv,image/*",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="mt-8 flex flex-col gap-2 border-t pt-8">
        <Text.h2 variant="heading-lg">Field types</Text.h2>
        <Text variant="body-md" className="text-muted-foreground max-w-3xl">
          Every control in one form. Short controls take one column; text areas, checkbox groups,
          date ranges and file uploads span the row. Submit with empty required fields to see the
          errors.
        </Text>
      </div>

      <Form onFormSubmit={() => toast.success("Saved")}>
        <FormLayout columns={3}>
          {/* 🔽 Text and numbers */}
          <FormLayout.Section title="Text and numbers" description="Field.Control and Textarea.">
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
            <Field.Root name="phone">
              <Field.Label>Phone</Field.Label>
              <Field.Control type="tel" placeholder="+81 6 1234 5678" />
            </Field.Root>
            <Field.Root name="quantity">
              <Field.Label required>Quantity</Field.Label>
              <Field.Control type="number" min={1} required defaultValue={120} />
              <Field.Description>Units, minimum 1.</Field.Description>
              <Field.Error match="rangeUnderflow">Order at least 1 unit.</Field.Error>
            </Field.Root>
            <Field.Root name="unitPrice">
              <Field.Label>Unit price (USD)</Field.Label>
              <Field.Control type="number" step="0.01" min={0} placeholder="38.50" />
            </Field.Root>
            {/* 🧪 Dummy Data: Replace with real data later */}
            <Field.Root name="taxId" invalid={taxIdTaken}>
              <Field.Label>Tax ID</Field.Label>
              <Field.Control defaultValue="T1234567890123" onChange={() => setTaxIdTaken(false)} />
              <Field.Error match={taxIdTaken}>
                This tax ID is already on another supplier. Edit it to save.
              </Field.Error>
            </Field.Root>
            <Field.Root name="notes" span="full">
              <Field.Label>Notes</Field.Label>
              <Textarea rows={3} placeholder="Anything the warehouse should know" />
              <Field.Description>Shown on the receiving note.</Field.Description>
            </Field.Root>
          </FormLayout.Section>

          {/* 🔽 Choices */}
          <FormLayout.Section
            title="Choices"
            description="Select, Combobox, Autocomplete and Checkbox."
          >
            <Field.Root name="paymentTerms">
              <Field.Label required>Payment terms</Field.Label>
              <Select items={PAYMENT_TERMS} placeholder="Select terms" required />
              <Field.Error match="valueMissing">Choose payment terms.</Field.Error>
            </Field.Root>
            <Field.Root name="departments">
              <Field.Label>Departments</Field.Label>
              <Select items={DEPARTMENTS} multiple placeholder="Select departments" />
              <Field.Description>Select, several at once.</Field.Description>
            </Field.Root>
            <Field.Root name="supplier">
              <Field.Label required>Supplier</Field.Label>
              <Combobox items={SUPPLIERS} placeholder="Search suppliers" required />
              <Field.Description>Combobox: search a fixed list.</Field.Description>
              <Field.Error match="valueMissing">Choose a supplier.</Field.Error>
            </Field.Root>
            <Field.Root name="tags">
              <Field.Label>Tags</Field.Label>
              <Combobox items={TAGS} multiple placeholder="Add tags" />
              <Field.Description>Combobox, several at once.</Field.Description>
            </Field.Root>
            <Field.Root name="carrier">
              <Field.Label>Carrier</Field.Label>
              <Autocomplete items={CARRIERS} placeholder="Type or pick a carrier" />
              <Field.Description>Autocomplete: suggestions, any text allowed.</Field.Description>
            </Field.Root>
            <Field.Root name="buyer">
              <Field.Label>Buyer</Field.Label>
              <Select items={BUYERS} defaultValue="Hanna Suzuki" disabled />
              <Field.Description>Disabled: set from your account.</Field.Description>
            </Field.Root>
            <Fieldset.Root span="full" className="flex flex-col gap-2">
              <Fieldset.Legend>Notify on receipt</Fieldset.Legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Checkbox name="notifyBuyer" label="Buyer" defaultChecked />
                <Checkbox name="notifyWarehouse" label="Warehouse" defaultChecked />
                <Checkbox name="notifyFinance" label="Finance" />
                <Checkbox name="notifySupplier" label="Supplier" />
              </div>
            </Fieldset.Root>
            <Field.Root name="inspection" span="full">
              <Checkbox label="Hold for quality inspection before putaway" />
            </Field.Root>
          </FormLayout.Section>

          {/* 🔽 Dates */}
          <FormLayout.Section
            title="Dates"
            description="DateField to type a date, DatePicker to pick one, DateRangePicker for a range."
          >
            <Field.Root name="orderDate">
              <Field.Label required>Order date</Field.Label>
              <DateField isRequired />
              <Field.Error match="valueMissing">Enter the order date.</Field.Error>
            </Field.Root>
            <Field.Root name="eta">
              <Field.Label>Expected delivery</Field.Label>
              <DatePicker />
            </Field.Root>
            <Field.Root name="window" span={2}>
              <Field.Label>Delivery window</Field.Label>
              <DateRangePicker />
              <Field.Description>The dock accepts the goods on these dates.</Field.Description>
            </Field.Root>
          </FormLayout.Section>

          {/* 🔽 Files */}
          <FormLayout.Section
            title="Documents"
            description="Attachment: drop files or click to upload. Quotes, spec sheets, delivery notes."
          >
            <FormLayout.Item span="full">
              <Attachment
                {...files.props}
                uploadLabel="Upload documents"
                uploadHint="PDF, Excel, CSV or images"
              />
            </FormLayout.Item>
          </FormLayout.Section>

          {/* 🔽 Read-only values */}
          <FormLayout.Section
            title="Read-only"
            description="Field.Value: values the user can see but not change, in the same grid."
          >
            {/* 🧪 Dummy Data: Replace with real data later */}
            <Field.Root>
              <Field.Label className="text-muted-foreground">PO number</Field.Label>
              <Field.Value>PO-10000041</Field.Value>
            </Field.Root>
            <Field.Root>
              <Field.Label className="text-muted-foreground">Created by</Field.Label>
              <Field.Value>Kenji Mori</Field.Value>
            </Field.Root>
            <Field.Root>
              <Field.Label className="text-muted-foreground">Created on</Field.Label>
              <Field.Value>28 Oct 2026</Field.Value>
            </Field.Root>
          </FormLayout.Section>

          <FormLayout.Actions>
            <Button type="reset" variant="outline">
              Reset
            </Button>
            <Button type="submit">Save</Button>
          </FormLayout.Actions>
        </FormLayout>
      </Form>
    </div>
  );
}
