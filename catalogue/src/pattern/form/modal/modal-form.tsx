/* pattern: form/modal */
import { Button, Dialog, Field, Form } from "@tailor-platform/app-shell";

type Address = {
  label: string;
  street: string;
  city: string;
};

type Props = {
  onSave: (data: Address) => void;
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
        {/*
         * `Form` + `onFormSubmit` replaces a hand-rolled `<form onSubmit>` +
         * `FormData`: values arrive parsed, and validation runs before the
         * handler fires. Every text field is uncontrolled — no state needed.
         */}
        <Form<Address> noValidate onFormSubmit={(values) => onSave(values)}>
          <div className="space-y-4 py-4">
            <Field.Root name="label">
              <Field.Label>Label</Field.Label>
              <Field.Control required placeholder="Head office" />
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
            <Dialog.Close render={<Button variant="ghost" />}>Cancel</Dialog.Close>
            <Button type="submit">Save</Button>
          </Dialog.Footer>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
