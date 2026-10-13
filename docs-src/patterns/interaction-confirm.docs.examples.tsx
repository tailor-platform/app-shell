import { Button, Dialog } from "@tailor-platform/app-shell";

export function InteractionConfirm() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="destructive" />}>Delete</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete order ORD-1024?</Dialog.Title>
          <Dialog.Description>
            This will remove the order and all its line items. This action cannot be undone.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Dialog.Close render={<Button variant="destructive" />}>Delete</Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
