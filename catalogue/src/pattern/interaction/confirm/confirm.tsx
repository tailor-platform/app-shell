/* pattern: interaction/confirm */
import { Button, Dialog } from "@tailor-platform/app-shell";

type Props = {
  orderId: string;
  onDelete: () => void;
};

export default function ConfirmDialog({ orderId, onDelete }: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="destructive" />}>Delete</Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Delete order {orderId}?</Dialog.Title>
          <Dialog.Description>
            This will remove the order and all its line items. This action cannot be undone.
          </Dialog.Description>
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
