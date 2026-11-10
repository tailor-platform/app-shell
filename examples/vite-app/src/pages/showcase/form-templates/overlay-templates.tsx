import * as React from "react";
import { Button, Dialog, Form, Sheet } from "@tailor-platform/app-shell";

// Overlay templates: the form opens on top of the current page. Each one puts
// `Form id` inside the scrolling body and submits from the footer with
// `form="<id>"`, so the footer stays visible however long the form gets.

// 🔽 T1 — Modal form. One template at every size: `size` follows the form's
// length (sm/md for a handful of fields, lg/xl once it needs plain sections).
export function ModalForm({
  trigger,
  size = "md",
  title,
  description,
  submitLabel,
  children,
}: {
  trigger: React.ReactElement;
  size?: React.ComponentProps<typeof Dialog.Content>["size"];
  title: string;
  description?: string;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const formId = React.useId();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={trigger} />
      <Dialog.Content size={size}>
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
          {description != null && <Dialog.Description>{description}</Dialog.Description>}
        </Dialog.Header>
        <Dialog.Body>
          <Form id={formId} onFormSubmit={() => setOpen(false)}>
            {children}
          </Form>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button type="submit" form={formId}>
            {submitLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// 🔽 T2 — Side sheet (edit while keeping the list or detail in view)
export function SheetForm({
  trigger,
  title,
  description,
  submitLabel,
  children,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const formId = React.useId();
  return (
    <Sheet.Root open={open} onOpenChange={setOpen}>
      <Sheet.Trigger render={trigger} />
      <Sheet.Content size="lg">
        <Sheet.Header>
          <Sheet.Title>{title}</Sheet.Title>
          {description != null && <Sheet.Description>{description}</Sheet.Description>}
        </Sheet.Header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <Form id={formId} onFormSubmit={() => setOpen(false)}>
            {children}
          </Form>
        </div>
        <Sheet.Footer>
          <Sheet.Close render={<Button variant="outline" />}>Cancel</Sheet.Close>
          <Button type="submit" form={formId}>
            {submitLabel}
          </Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}
