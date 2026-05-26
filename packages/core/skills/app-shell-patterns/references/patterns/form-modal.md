---
slug: pattern/form/modal
name: Modal Form
category: pattern
subcategory: form
description: Default form pattern for Create/Edit — keeps user in context on the parent screen
requiredImports: [Dialog, Button, Form, Field, Input]
tags: [form, modal, dialog, create, edit, inline-add]
do:
  - Default for most Create and Edit forms — keeps user in context on parent screen
  - Inline add of a related entity from another screen (add address from order detail)
  - Quick configuration changes and single-purpose forms (rename, change status)
  - Any form the design hasn't explicitly called out as a full-page routed screen
dont:
  - Design explicitly calls for a full-page (non-overlay) routed Create or Edit
  - Form is complex with 15+ fields or multiple grouped sections — use form/sectioned
  - Multi-stage flow with per-step validation — use form/wizard
---

# pattern/form/modal

## When to Use

- Default for most Create and Edit forms — keeps user in context on parent screen
- Inline add of a related entity from another screen (add address from order detail)
- Quick configuration changes and single-purpose forms (rename, change status)
- Any form the design hasn't explicitly called out as a full-page routed screen

## Page Implementation

```tsx
/* pattern: form/modal */
import { Button, Dialog, Input, Field } from "@tailor-platform/app-shell";

type Props = {
  onSave: (data: { label: string; street: string; city: string }) => void;
};

export default function ModalForm({ onSave }: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button />}>Add address</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Add address</Dialog.Title>
          <Dialog.Description>Add a shipping address to this order.</Dialog.Description>
        </Dialog.Header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            onSave({
              label: formData.get("label") as string,
              street: formData.get("street") as string,
              city: formData.get("city") as string,
            });
          }}
        >
          <div className="space-y-4 py-4">
            <Field.Root name="label">
              <Field.Label>Label</Field.Label>
              <Field.Control render={<Input />} />
            </Field.Root>
            <Field.Root name="street">
              <Field.Label>Street</Field.Label>
              <Field.Control render={<Input />} />
            </Field.Root>
            <Field.Root name="city">
              <Field.Label>City</Field.Label>
              <Field.Control render={<Input />} />
            </Field.Root>
          </div>
          <Dialog.Footer>
            <Dialog.Close render={<Button variant="ghost" />}>Cancel</Dialog.Close>
            <Button type="submit">Save</Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
```

## Route-driven Variant

```tsx
/* pattern: form/modal (route-driven variant) */
import { Button, Dialog, Input, Layout, Field } from "@tailor-platform/app-shell";

type Props = {
  isCreateOpen: boolean;
  onNavigateToCreate: () => void;
  onNavigateToList: () => void;
  onSave: (data: { name: string }) => void;
};

/**
 * Route-driven modal: the form has its own URL but renders as a popup
 * over the list. Both `/products` and `/products/create` render this
 * same component — the parent list stays visible underneath.
 */
export default function ModalFormRouted({
  isCreateOpen,
  onNavigateToCreate,
  onNavigateToList,
  onSave,
}: Props) {
  return (
    <Layout>
      <Layout.Header
        title="Products"
        actions={[
          <Button key="create" onClick={onNavigateToCreate}>
            Create
          </Button>,
        ]}
      />
      <Layout.Column>{/* products list — see list/dense-scan */}</Layout.Column>

      <Dialog.Root
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) onNavigateToList();
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Create product</Dialog.Title>
          </Dialog.Header>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              onSave({ name: formData.get("name") as string });
            }}
          >
            <div className="space-y-4 py-4">
              <Field.Root name="name">
                <Field.Label>Name</Field.Label>
                <Field.Control render={<Input />} />
              </Field.Root>
            </div>
            <Dialog.Footer>
              <Button variant="ghost" onClick={onNavigateToList}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Layout>
  );
}
```

## Constraints

- Dialog renders full-screen sheet below 1024px; centered max-w-md at 1024–1280px
- Route-driven variant requires both parent path and create/edit path to render the same component
- `onOpenChange` must navigate back — just calling `setOpen(false)` leaves the URL broken

## Anti-patterns

- Nesting modals — opening a Dialog from inside another Dialog
- Modal containing a wizard — promote to a routed `form/wizard`
- Save closes the dialog but parent state is stale — wire refetch or optimistic update
- Building a routed Create/Edit page when the design didn't explicitly call for one — modal is the default
- Registering the create path as a separate top-level route — that unmounts the parent list
