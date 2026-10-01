import { useState } from "react";

import { Button, Dialog, Field, Input, Layout } from "@tailor-platform/app-shell";

export function ModalForm() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button />}>Add address</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Add address</Dialog.Title>
          <Dialog.Description>Add a shipping address to this order.</Dialog.Description>
        </Dialog.Header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            window.alert(`Saving ${data.get("label") ?? ""}`);
          }}
        >
          <div className="flex flex-col gap-4 py-4">
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
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              window.alert(`Saving ${data.get("name") ?? ""}`);
              setCreateOpen(false);
            }}
          >
            <div className="flex flex-col gap-4 py-4">
              <Field.Root name="name">
                <Field.Label>Name</Field.Label>
                <Field.Control render={<Input />} />
              </Field.Root>
            </div>
            <Dialog.Footer>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
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
