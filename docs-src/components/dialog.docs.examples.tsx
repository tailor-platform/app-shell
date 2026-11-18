import { useState } from "react";

import { Button, Dialog, Field, Form, Text } from "@tailor-platform/app-shell";

export function DeleteConfirmation() {
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  return (
    <div className="space-y-3">
      <Text.p role="status">{deleted ? "Demo order deleted." : "Demo order: ORD-1001"}</Text.p>
      <div className="flex gap-2">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger disabled={deleted} render={<Button variant="destructive" />}>
            Delete demo order
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete demo order?</Dialog.Title>
              <Dialog.Description>
                Remove ORD-1001 from this local example. No server data is changed.
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close render={<Button type="button" variant="outline" />}>
                Cancel
              </Dialog.Close>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDeleted(true);
                  setOpen(false);
                }}
              >
                Delete order
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
        <Button
          type="button"
          variant="outline"
          disabled={!deleted}
          onClick={() => setDeleted(false)}
        >
          Restore demo order
        </Button>
      </div>
    </div>
  );
}

export function FormDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Small carton");

  return (
    <div className="space-y-3">
      <Text.p role="status">Saved item name: {name}</Text.p>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger render={<Button variant="outline" />}>Edit item</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Edit item</Dialog.Title>
            <Dialog.Description>
              Save a new name, or cancel to keep the saved name.
            </Dialog.Description>
          </Dialog.Header>
          <Form<{ name: string }>
            noValidate
            onFormSubmit={(values) => {
              setName(values.name.trim());
              setOpen(false);
            }}
          >
            <Field.Root
              name="name"
              className="py-4"
              validate={(value) =>
                typeof value === "string" && value.trim() ? undefined : "Name is required."
              }
            >
              <Field.Label>Item name</Field.Label>
              <Field.Control defaultValue={name} required />
              <Field.Error>Name is required.</Field.Error>
            </Field.Root>
            <Dialog.Footer>
              <Dialog.Close render={<Button type="button" variant="outline" />}>
                Cancel
              </Dialog.Close>
              <Button type="submit">Save item</Button>
            </Dialog.Footer>
          </Form>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

export function BasicUsage() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Confirm Action</Dialog.Title>
          <Dialog.Description>Are you sure you want to proceed?</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button>Confirm</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function Controlled() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open Dialog
      </Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Settings</Dialog.Title>
          </Dialog.Header>
          <Dialog.Footer>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
