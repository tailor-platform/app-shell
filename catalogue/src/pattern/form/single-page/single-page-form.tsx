/* pattern: form/single-page */
import { Button, Layout, Input, Textarea, Select, Field } from "@tailor-platform/app-shell";

type Props = {
  onSave: (data: Record<string, string>) => void;
  onCancel: () => void;
};

export default function SinglePageForm({ onSave, onCancel }: Props) {
  return (
    <Layout>
      <Layout.Header
        title="Create Product"
        actions={[
          <Button key="cancel" variant="outline" onClick={onCancel}>
            Cancel
          </Button>,
          <Button key="save" type="submit" form="single-page-form">
            Save
          </Button>,
        ]}
      />
      <Layout.Column>
        <form
          id="single-page-form"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const entries: Record<string, string> = {};
            formData.forEach((value, key) => {
              entries[key] = value as string;
            });
            onSave(entries);
          }}
          className="space-y-4 max-w-2xl"
        >
          <Field.Root name="name">
            <Field.Label>Name</Field.Label>
            <Field.Control render={<Input />} />
          </Field.Root>
          <Field.Root name="sku">
            <Field.Label>SKU</Field.Label>
            <Field.Control render={<Input />} />
          </Field.Root>
          <Field.Root name="category">
            <Field.Label>Category</Field.Label>
            <Select
              items={["Electronics", "Furniture", "Clothing", "Food"]}
              placeholder="Select category"
            />
          </Field.Root>
          <Field.Root name="price">
            <Field.Label>Price</Field.Label>
            <Field.Control render={<Input type="number" />} />
          </Field.Root>
          <Field.Root name="description">
            <Field.Label>Description</Field.Label>
            <Textarea rows={4} />
          </Field.Root>
        </form>
      </Layout.Column>
    </Layout>
  );
}
