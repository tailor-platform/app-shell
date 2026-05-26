---
slug: pattern/form/sectioned
name: Sectioned Form
category: pattern
subcategory: form
description: Complex form with 15+ fields organized into named fieldset sections
requiredImports: [Layout, Form, Fieldset, Field, Input, Select, Combobox, Button]
tags: [form, sections, fieldset, settings, complex]
do:
  - Form is complex with 15+ fields or multiple grouped sections (Identity, Pricing, Inventory)
  - Configure-style settings pages with named boundaries
dont:
  - Simple Create/Edit — use form/modal (the default)
  - Routed Create/Edit at moderate size with no grouping — use form/single-page
  - Step-gated validation across stages — use form/wizard
---

# pattern/form/sectioned

## When to Use

- Form is complex with 15+ fields or multiple grouped sections (Identity, Pricing, Inventory)
- Configure-style settings pages with named boundaries

## Page Implementation

```tsx
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
```

## Constraints

- Max ~6 sections — more than that is too hard to scan; promote to `form/wizard`
- Required-marker convention must be consistent across all sections
- Section legends must match anchor-nav labels

## Anti-patterns

- More than ~6 sections — hard to scan; promote to `form/wizard`
- Required-marker convention varies between sections — pick one rule and apply everywhere
- Section legends that don't match anchor-nav labels
