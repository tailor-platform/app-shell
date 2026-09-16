/* pattern: form/sectioned */
import { Button, Card, Combobox, Field, Fieldset, Form, Layout } from "@tailor-platform/app-shell";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY"];

const WAREHOUSES = [
  { id: 1, name: "Tokyo DC" },
  { id: 2, name: "Osaka DC" },
  { id: 3, name: "Nagoya DC" },
];

const SECTIONS = [
  { id: "identity", title: "Identity", description: "How the product is named and referenced." },
  { id: "pricing", title: "Pricing", description: "List price and the currency it is quoted in." },
  { id: "inventory", title: "Inventory", description: "Opening stock and replenishment trigger." },
];

const anchorIdFor = (id: string) => `section-${id}`;

type Props = {
  onSave: (data: Record<string, unknown>) => void;
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
          <Button key="save" type="submit" form="product-settings-form">
            Save
          </Button>,
        ]}
      />
      <Layout.Column>
        <Form
          id="product-settings-form"
          noValidate
          className="space-y-4"
          onFormSubmit={(values) => onSave(values)}
        >
          {/* Anchor nav — each entry targets its section's Card by id. */}
          <nav aria-label="Sections" className="flex gap-4 text-sm">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${anchorIdFor(section.id)}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {section.title}
              </a>
            ))}
          </nav>

          <Card.Root id={anchorIdFor("identity")}>
            <Card.Header title={SECTIONS[0].title} description={SECTIONS[0].description} />
            <Card.Content>
              <Fieldset.Root className="grid gap-4 md:grid-cols-2">
                <Field.Root name="name">
                  <Field.Label>Name</Field.Label>
                  <Field.Control required />
                  <Field.Error match="valueMissing">Name is required.</Field.Error>
                </Field.Root>
                <Field.Root name="sku">
                  <Field.Label>SKU</Field.Label>
                  <Field.Control required />
                  <Field.Error match="valueMissing">SKU is required.</Field.Error>
                </Field.Root>
                <Field.Root name="description" className="md:col-span-2">
                  <Field.Label>Description</Field.Label>
                  <Field.Control />
                </Field.Root>
              </Fieldset.Root>
            </Card.Content>
          </Card.Root>

          <Card.Root id={anchorIdFor("pricing")}>
            <Card.Header title={SECTIONS[1].title} description={SECTIONS[1].description} />
            <Card.Content>
              <Fieldset.Root className="grid gap-4 md:grid-cols-2">
                <Field.Root name="price">
                  <Field.Label>Price</Field.Label>
                  <Field.Control type="number" required min={0} step="0.01" />
                  <Field.Error match="valueMissing">Price is required.</Field.Error>
                </Field.Root>
                <Field.Root name="currency">
                  <Field.Label>Currency</Field.Label>
                  <Combobox items={CURRENCIES} defaultValue="USD" placeholder="Select currency" />
                  <Field.Error />
                </Field.Root>
              </Fieldset.Root>
            </Card.Content>
          </Card.Root>

          <Card.Root id={anchorIdFor("inventory")}>
            <Card.Header title={SECTIONS[2].title} description={SECTIONS[2].description} />
            <Card.Content>
              <Fieldset.Root className="grid gap-4 md:grid-cols-2">
                <Field.Root name="quantity">
                  <Field.Label>Initial quantity</Field.Label>
                  <Field.Control type="number" required min={0} />
                  <Field.Error match="valueMissing">Initial quantity is required.</Field.Error>
                </Field.Root>
                <Field.Root name="reorderPoint">
                  <Field.Label>Reorder point</Field.Label>
                  <Field.Control type="number" min={0} />
                  <Field.Description>
                    Leave blank to disable replenishment alerts.
                  </Field.Description>
                </Field.Root>
                {/*
                 * Object items would otherwise reach `onFormSubmit` as JSON.
                 * `itemToStringValue` picks the field to submit; `mapItem`
                 * stays responsible for what the user sees.
                 */}
                <Field.Root name="warehouse">
                  <Field.Label>Default warehouse</Field.Label>
                  <Combobox
                    items={WAREHOUSES}
                    mapItem={(w) => ({ label: w.name, key: String(w.id) })}
                    itemToStringValue={(w) => String(w.id)}
                    placeholder="Select warehouse"
                  />
                </Field.Root>
              </Fieldset.Root>
            </Card.Content>
          </Card.Root>
        </Form>
      </Layout.Column>
    </Layout>
  );
}
