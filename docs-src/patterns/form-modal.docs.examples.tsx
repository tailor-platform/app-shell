import { useState } from "react";

import { Button, Dialog, Field, Form, Layout } from "@tailor-platform/app-shell";

type AddressDraft = {
  label: string;
  street: string;
  city: string;
};

export function ModalForm() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button />}>Add address</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Add address</Dialog.Title>
          <Dialog.Description>Add a shipping address to this order.</Dialog.Description>
        </Dialog.Header>
        {/*
         * `onFormSubmit` fires only after validation passes and receives the
         * registered field values — no `<form onSubmit>` + `new FormData(...)`.
         */}
        <Form<AddressDraft>
          noValidate
          onFormSubmit={(values) => window.alert(`Saving ${values.label}`)}
        >
          <div className="flex flex-col gap-4 py-4">
            <Field.Root name="label">
              <Field.Label>Label</Field.Label>
              <Field.Control required />
              <Field.Error match="valueMissing">Label is required.</Field.Error>
            </Field.Root>
            <Field.Root name="street">
              <Field.Label>Street</Field.Label>
              <Field.Control required />
              <Field.Error match="valueMissing">Street is required.</Field.Error>
            </Field.Root>
            <Field.Root name="city">
              <Field.Label>City</Field.Label>
              <Field.Control required />
              <Field.Error match="valueMissing">City is required.</Field.Error>
            </Field.Root>
          </div>
          <Dialog.Footer>
            <Dialog.Close render={<Button type="button" variant="ghost" />}>Cancel</Dialog.Close>
            <Button type="submit">Save</Button>
          </Dialog.Footer>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

type ProductDraft = {
  name: string;
};

// Route-driven variant: the form has its own URL but renders as a popup over the
// list — both `/products` and `/products/create` render this same component, so
// the list stays visible underneath. Local state stands in for the router here;
// in a real app `isCreateOpen` derives from the route and the handlers call
// `useNavigate()` to move between `/products` and `/products/create`.
export function ModalFormRouted() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  return (
    <Layout>
      <Layout.Header
        title="Products"
        actions={[
          <Button key="create" onClick={() => setCreateOpen(true)}>
            Create
          </Button>,
        ]}
      />
      <Layout.Column>{/* products list — see list/dense-scan */}</Layout.Column>

      <Dialog.Root open={isCreateOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Create product</Dialog.Title>
          </Dialog.Header>
          <Form<ProductDraft>
            noValidate
            onFormSubmit={(values) => {
              window.alert(`Saving ${values.name}`);
              setCreateOpen(false);
            }}
          >
            <div className="flex flex-col gap-4 py-4">
              <Field.Root name="name">
                <Field.Label>Name</Field.Label>
                <Field.Control required />
                <Field.Error match="valueMissing">Name is required.</Field.Error>
              </Field.Root>
            </div>
            <Dialog.Footer>
              {/* Inside a `<Form>` an untyped button submits — Cancel must be `type="button"`. */}
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </Dialog.Footer>
          </Form>
        </Dialog.Content>
      </Dialog.Root>
    </Layout>
  );
}
