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

type ContactDraft = {
  email: string;
};

// Second level: a confirmation on top of the form modal. The confirm dialog is
// rendered inside the form dialog's content, so Escape and an outside press close
// only the confirm, and focus returns to the form when it closes.
export function ModalFormConfirm() {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const close = () => {
    setConfirmOpen(false);
    setDirty(false);
    setOpen(false);
  };

  const requestClose = () => (dirty ? setConfirmOpen(true) : close());

  return (
    // Escape, the close button and a press on the scrim all arrive as `onOpenChange(false)`.
    <Dialog.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : requestClose())}>
      <Dialog.Trigger render={<Button />}>Add contact</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Add contact</Dialog.Title>
        </Dialog.Header>
        <Form<ContactDraft>
          noValidate
          onFormSubmit={(values) => {
            window.alert(`Saving ${values.email}`);
            close();
          }}
        >
          <div className="flex flex-col gap-4 py-4" onInput={() => setDirty(true)}>
            <Field.Root name="email">
              <Field.Label>Email</Field.Label>
              <Field.Control type="email" required />
              <Field.Error match="valueMissing">Email is required.</Field.Error>
            </Field.Root>
          </div>
          <Dialog.Footer>
            <Button type="button" variant="ghost" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </Dialog.Footer>
        </Form>

        <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Discard changes?</Dialog.Title>
              <Dialog.Description>The contact you typed will be lost.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close render={<Button type="button" variant="outline" />}>
                Keep editing
              </Dialog.Close>
              <Button type="button" variant="destructive" onClick={close}>
                Discard
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}
