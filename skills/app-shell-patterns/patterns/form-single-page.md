---
slug: pattern/form/single-page
name: Single Page Form
category: pattern
subcategory: form
description: Routed full-page form for moderate field count (6-15) without natural sectioning
requiredImports: [Layout, Form, Field, Fieldset, Input, Select, Button]
tags: [form, page, create, edit, routed]
do:
  - A routed Create or Edit page that the design has explicitly called out (e.g. /orders/create)
  - Moderate field count (roughly 6-15) without natural sectioning, completed in one pass
dont:
  - Default Create/Edit with no explicit routing requirement — use form/modal (the default)
  - 15+ fields or grouped concerns — use form/sectioned
  - Multi-stage flow — use form/wizard
---

# pattern/form/single-page

## When to Use

- A routed Create or Edit page that the design has explicitly called out
- Moderate field count (roughly 6–15) without natural sectioning, completed in one pass

## Page Implementation

```tsx
/* pattern: form/single-page */
import { Button, Layout, Input, Select, Field } from "@tailor-platform/app-shell";

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
            <Field.Control render={<Input />} />
          </Field.Root>
        </form>
      </Layout.Column>
    </Layout>
  );
}
```

## Constraints

- Single column full width below 1024px; single column max-w constrained at 1024–1280px
- Without an explicit routed-page requirement, the answer is `form/modal`
- A `/create` or `/edit` route in the screen spec does NOT require a full-page replacement

## Anti-patterns

- Two-column layout for unrelated fields — breaks the linear reading order
- No required-field markers — users can't predict which fields will error
- Errors shown above the form rather than below the offending field
- Choosing this pattern for a Create flow because it's a Create flow — without explicit need, use `form/modal`
