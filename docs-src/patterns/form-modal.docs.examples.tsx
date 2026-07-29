import { Button, Dialog, Field, Input } from "@tailor-platform/app-shell";

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
