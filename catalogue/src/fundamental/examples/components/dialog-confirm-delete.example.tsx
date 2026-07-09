import { Button, Dialog } from "@tailor-platform/app-shell";

export function DialogConfirmDeleteExample() {
  const onDelete = () => {};

  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="destructive" />}>Delete</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete order #1234?</Dialog.Title>
          <Dialog.Description>This cannot be undone.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
