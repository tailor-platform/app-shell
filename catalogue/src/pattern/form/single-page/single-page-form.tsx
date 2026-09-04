/* pattern: form/single-page */
import { Button, Field, Form, Textarea, Layout, Select } from "@tailor-platform/app-shell";

const CATEGORIES = ["Electronics", "Furniture", "Clothing", "Food"];

type ProductDraft = {
  name: string;
  sku: string;
  category: string;
  price: string;
  description: string;
};

type Props = {
  onSave: (data: ProductDraft) => void;
  onCancel: () => void;
};

export default function SinglePageForm({ onSave, onCancel }: Props) {
  return (
    <Layout>
      {/*
       * Save/Cancel live in the page header and reach the form through the
       * native `form` attribute, matching `Form`'s `id`. No state plumbing.
       */}
      <Layout.Header
        title="Create product"
        actions={[
          <Button key="cancel" variant="outline" onClick={onCancel}>
            Cancel
          </Button>,
          <Button key="save" type="submit" form="product-form">
            Save
          </Button>,
        ]}
      />
      <Layout.Column>
        <Form<ProductDraft>
          id="product-form"
          noValidate
          className="max-w-2xl space-y-4"
          onFormSubmit={(values) => onSave(values)}
        >
          <Field.Root name="name">
            <Field.Label>Name</Field.Label>
            <Field.Control required />
            <Field.Error match="valueMissing">Name is required.</Field.Error>
          </Field.Root>
          <Field.Root name="sku">
            <Field.Label>SKU</Field.Label>
            <Field.Control required pattern="[A-Z]{3}-[0-9]{4}" />
            <Field.Description>Format: ABC-1234</Field.Description>
            <Field.Error match="patternMismatch">Use the format ABC-1234.</Field.Error>
            <Field.Error match="valueMissing">SKU is required.</Field.Error>
          </Field.Root>
          {/*
           * Dropdowns need no `name` and no React state: `Field.Root` registers
           * the control, so its value arrives in `onFormSubmit` under the
           * field's name like any other input.
           */}
          <Field.Root name="category">
            <Field.Label>Category</Field.Label>
            <Select items={CATEGORIES} placeholder="Select category" />
            <Field.Error />
          </Field.Root>
          <Field.Root name="price">
            <Field.Label>Price</Field.Label>
            <Field.Control type="number" required min={0} step="0.01" />
            <Field.Error match="rangeUnderflow">Price cannot be negative.</Field.Error>
            <Field.Error match="valueMissing">Price is required.</Field.Error>
          </Field.Root>
          <Field.Root name="description">
            <Field.Label>Description</Field.Label>
            <Textarea rows={4} />
          </Field.Root>
        </Form>
      </Layout.Column>
    </Layout>
  );
}
