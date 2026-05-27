/* pattern: form/sectioned */
import { Button, Layout, Input, Select, Field, Fieldset } from "@tailor-platform/app-shell";

type Props = {
  onSave: (data: Record<string, string>) => void;
  onCancel: () => void;
};

export default function SectionedForm({ onSave, onCancel }: Props) {
  return (
    <Layout>
      <Layout.Header
        title="Product settings"
        actions={[
          <Button key="cancel" variant="outline" onClick={onCancel}>
            Cancel
          </Button>,
          <Button key="save" type="submit" form="sectioned-form">
            Save
          </Button>,
        ]}
      />
      <Layout.Column>
        <form
          id="sectioned-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const entries: Record<string, string> = {};
            formData.forEach((value, key) => {
              entries[key] = value as string;
            });
            onSave(entries);
          }}
          className="space-y-8"
        >
          <Fieldset.Root>
            <Fieldset.Legend>Identity</Fieldset.Legend>
            <div className="space-y-4">
              <Field.Root name="name">
                <Field.Label>Name</Field.Label>
                <Field.Control render={<Input />} />
              </Field.Root>
              <Field.Root name="sku">
                <Field.Label>SKU</Field.Label>
                <Field.Control render={<Input />} />
              </Field.Root>
              <Field.Root name="description">
                <Field.Label>Description</Field.Label>
                <Field.Control render={<Input />} />
              </Field.Root>
            </div>
          </Fieldset.Root>

          <Fieldset.Root>
            <Fieldset.Legend>Pricing</Fieldset.Legend>
            <div className="space-y-4">
              <Field.Root name="price">
                <Field.Label>Price</Field.Label>
                <Field.Control render={<Input type="number" />} />
              </Field.Root>
              <Field.Root name="currency">
                <Field.Label>Currency</Field.Label>
                <Select items={["USD", "EUR", "GBP", "JPY"]} placeholder="Select currency" />
              </Field.Root>
            </div>
          </Fieldset.Root>

          <Fieldset.Root>
            <Fieldset.Legend>Inventory</Fieldset.Legend>
            <div className="space-y-4">
              <Field.Root name="quantity">
                <Field.Label>Initial quantity</Field.Label>
                <Field.Control render={<Input type="number" />} />
              </Field.Root>
              <Field.Root name="reorderPoint">
                <Field.Label>Reorder point</Field.Label>
                <Field.Control render={<Input type="number" />} />
              </Field.Root>
            </div>
          </Fieldset.Root>
        </form>
      </Layout.Column>
    </Layout>
  );
}
