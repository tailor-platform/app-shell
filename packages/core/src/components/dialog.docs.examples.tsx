import { useState } from "react";
import { Button, Dialog } from "@tailor-platform/app-shell";

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
