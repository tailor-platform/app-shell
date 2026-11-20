import {
  Button,
  Combobox,
  DatePicker,
  Field,
  Fieldset,
  Form,
  Grid,
  Layout,
  Select,
  Text,
  Textarea,
  useNavigate,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { SupplierFields, DeliveryFields, BUYERS } from "./data";
import { ModalForm, SheetForm } from "./overlay-templates";
import { AddressFields, BillingFields } from "./fields";
import { FormSection } from "./form-section";
import { BuildAForm } from "./build-a-form";
import { AllFieldTypes } from "./all-field-types";
import { UsageNotes } from "./usage-notes";

// Form templates built from Grid + Card + Fieldset: a page, two modal sizes
// and a sheet, plus the build guide and Grid usage notes.

const BACK = "/showcase/grid-form";

// 🧪 Dummy Data: Replace with real data later
const ENTITIES = ["Denim Tears Inc. (US)", "Denim Tears KK (Japan)", "Denim Tears Ltd. (UK)"];
// 🧪 Dummy Data: Replace with real data later
// 🧪 Dummy Data: Replace with real data later
const STATUSES = ["Active", "On hold", "Inactive"];
// 🧪 Dummy Data: Replace with real data later
const TAX_CODES = ["Standard 10%", "Reduced 8%", "Exempt", "Reverse charge"];

// 🔽 Overlay triggers. Small modal: a short form (1–3 fields), one column.
// Large modal and sheet: the full form with every control type, including
// drag-and-drop documents, in two columns.
function Overlays() {
  return (
    <div className="flex flex-wrap gap-2">
      <ModalForm
        trigger={<Button variant="outline">Small modal</Button>}
        size="sm"
        title="Rename supplier"
        description="A short form: one column."
        submitLabel="Save"
      >
        <Grid maxColumns={2} gapX={6} gapY={4}>
          <Field.Root name="name">
            <Field.Label required>Supplier name</Field.Label>
            <Field.Control required defaultValue="Kansai Textile Co." />
            <Field.Error match="valueMissing">Enter a supplier name.</Field.Error>
          </Field.Root>
          <Field.Root name="code">
            <Field.Label required>Code</Field.Label>
            <Field.Control required defaultValue="SUP-0042" />
          </Field.Root>
          <Field.Root name="status">
            <Field.Label>Status</Field.Label>
            <Select items={STATUSES} defaultValue="Active" />
          </Field.Root>
        </Grid>
      </ModalForm>
      <ModalForm
        trigger={<Button variant="outline">Large modal</Button>}
        size="lg"
        title="Edit purchase order line"
        description="Every control, plus drag-and-drop documents."
        submitLabel="Save"
      >
        <AllFieldTypes />
      </ModalForm>
      <SheetForm
        trigger={<Button variant="outline">Sheet</Button>}
        title="Edit purchase order line"
        description="Every control, plus drag-and-drop documents."
        submitLabel="Save"
      >
        <AllFieldTypes />
      </SheetForm>
    </div>
  );
}

const Page = () => {
  const navigate = useNavigate();
  return (
    <Layout maxWidth="lg">
      <Layout.Header
        title="New purchase order (Grid)"
        actions={[
          <Button key="cancel" variant="outline" onClick={() => navigate(BACK)}>
            Cancel
          </Button>,
          <Button key="save" type="submit" form="grid-page-form">
            Create
          </Button>,
        ]}
      />
      <Layout.Column>
        <Form id="grid-page-form" onFormSubmit={() => navigate(BACK)}>
          <div className="flex flex-col gap-6">
            <Overlays />

            <FormSection title="Supplier" description="Who you are buying from and on what terms.">
              <SupplierFields />
              <Field.Root name="contactName">
                <Field.Label>Supplier contact</Field.Label>
                <Field.Control placeholder="Aiko Tanaka" />
              </Field.Root>
              <Field.Root name="contactEmail">
                <Field.Label>Contact email</Field.Label>
                <Field.Control type="email" placeholder="aiko@kansai-textile.jp" />
              </Field.Root>
              <Grid.Item colSpan="full">
                <Field.Root name="supplierNote">
                  <Field.Label>Note to supplier</Field.Label>
                  <Textarea rows={3} placeholder="Printed on the purchase order" />
                </Field.Root>
              </Grid.Item>
            </FormSection>

            <FormSection title="Delivery" description="Where and when the goods arrive.">
              <DeliveryFields withInstructions={false} />
              <Grid.Item colSpan={2}>
                <Fieldset.Root className="flex flex-col gap-3">
                  <Fieldset.Legend>Delivery address</Fieldset.Legend>
                  <AddressFields prefix="delivery" />
                </Fieldset.Root>
              </Grid.Item>
              <Grid.Item colSpan="full">
                <Field.Root name="deliveryInstructions">
                  <Field.Label>Delivery instructions</Field.Label>
                  <Textarea rows={3} placeholder="Dock hours, contact on arrival…" />
                </Field.Root>
              </Grid.Item>
            </FormSection>

            <FormSection title="Billing" description="Which entity is invoiced, and how.">
              <Field.Root name="billTo">
                <Field.Label required>Bill to</Field.Label>
                <Select items={ENTITIES} defaultValue={ENTITIES[0]} required />
              </Field.Root>
              <Field.Root name="taxCode">
                <Field.Label>Tax code</Field.Label>
                <Select items={TAX_CODES} defaultValue="Standard 10%" />
              </Field.Root>
              <Grid.Item colSpan={2}>
                <Fieldset.Root className="flex flex-col gap-3">
                  <Fieldset.Legend>Billing address</Fieldset.Legend>
                  <AddressFields prefix="billing" />
                </Fieldset.Root>
              </Grid.Item>
            </FormSection>

            <FormSection title="Approval" description="Who signs off before the PO is sent.">
              <Field.Root name="approver">
                <Field.Label required>Approver</Field.Label>
                <Combobox items={BUYERS} placeholder="Search people" required />
              </Field.Root>
              <Field.Root name="approveBy">
                <Field.Label>Approve by</Field.Label>
                <DatePicker />
              </Field.Root>
            </FormSection>

            <FormSection title="Ownership & notes">
              <BillingFields />
            </FormSection>

            {/* Action bar: plain flex, nothing Grid-specific to reuse */}
            <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
              <Text variant="body-md" className="mr-auto text-muted-foreground">
                Draft · not saved yet
              </Text>
              <Button type="button" variant="outline" onClick={() => navigate(BACK)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </div>
        </Form>
        <BuildAForm />
        <UsageNotes />
      </Layout.Column>
    </Layout>
  );
};

Page.appShellPageProps = {
  meta: { title: "Grid forms" },
} satisfies AppShellPageProps;

export default Page;
