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
