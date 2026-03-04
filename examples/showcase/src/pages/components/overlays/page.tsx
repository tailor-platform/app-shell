import { useState } from "react";
import {
  Button,
  Dialog,
  AlertDialog,
  Sheet,
  Popover,
  Tooltip,
  PreviewCard,
  Field,
  Input,
} from "@tailor-platform/app-shell";
import { Section, InfoIcon } from "../../../shared";

const OverlaysPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <Section title="Overlay Components">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
          }}
        >
          {/* Dialog */}
          <div
            className="astw:rounded-md astw:border astw:border-border astw:p-4"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <span className="astw:text-sm astw:font-medium">Dialog</span>
            <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
              <Dialog.Trigger>
                <Button variant="outline" size="sm">
                  Open Dialog
                </Button>
              </Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Edit Profile</Dialog.Title>
                  <Dialog.Description>
                    Make changes to your profile here. Click save when done.
                  </Dialog.Description>
                </Dialog.Header>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    padding: "1rem 0",
                  }}
                >
                  <Field.Root>
                    <Field.Label>Name</Field.Label>
                    <Field.Control
                      render={<Input defaultValue="John Doe" />}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Email</Field.Label>
                    <Field.Control
                      render={<Input defaultValue="john@example.com" />}
                    />
                  </Field.Root>
                </div>
                <Dialog.Footer>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>
                    Save changes
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Root>
          </div>

          {/* AlertDialog */}
          <div
            className="astw:rounded-md astw:border astw:border-border astw:p-4"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <span className="astw:text-sm astw:font-medium">AlertDialog</span>
            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Header>
                  <AlertDialog.Title>
                    Are you absolutely sure?
                  </AlertDialog.Title>
                  <AlertDialog.Description>
                    This action cannot be undone. This will permanently delete
                    your account and remove your data from our servers.
                  </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                  <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                  <AlertDialog.Action onClick={() => alert("Deleted!")}>
                    Yes, delete account
                  </AlertDialog.Action>
                </AlertDialog.Footer>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </div>

          {/* Sheet */}
          <div
            className="astw:rounded-md astw:border astw:border-border astw:p-4"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <span className="astw:text-sm astw:font-medium">Sheet</span>
            <Sheet.Root open={sheetOpen} onOpenChange={setSheetOpen}>
              <Sheet.Trigger>
                <Button variant="outline" size="sm">
                  Open Sheet
                </Button>
              </Sheet.Trigger>
              <Sheet.Content side="right">
                <Sheet.Header>
                  <Sheet.Title>Settings</Sheet.Title>
                  <Sheet.Description>
                    Adjust your application preferences here.
                  </Sheet.Description>
                </Sheet.Header>
                <div
                  style={{
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <Field.Root>
                    <Field.Label>Display Name</Field.Label>
                    <Field.Control
                      render={<Input defaultValue="John Doe" />}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Username</Field.Label>
                    <Field.Control
                      render={<Input defaultValue="@johndoe" />}
                    />
                  </Field.Root>
                </div>
                <Sheet.Footer>
                  <Button onClick={() => setSheetOpen(false)}>
                    Save changes
                  </Button>
                </Sheet.Footer>
              </Sheet.Content>
            </Sheet.Root>
          </div>

          {/* Popover */}
          <div
            className="astw:rounded-md astw:border astw:border-border astw:p-4"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <span className="astw:text-sm astw:font-medium">Popover</span>
            <Popover.Root>
              <Popover.Trigger>
                <Button variant="outline" size="sm">
                  Open Popover
                </Button>
              </Popover.Trigger>
              <Popover.Content>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <span className="astw:text-sm astw:font-semibold">
                    Dimensions
                  </span>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.5rem",
                    }}
                  >
                    <Field.Root>
                      <Field.Label>Width</Field.Label>
                      <Field.Control
                        render={<Input defaultValue="100%" />}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Height</Field.Label>
                      <Field.Control
                        render={<Input defaultValue="25px" />}
                      />
                    </Field.Root>
                  </div>
                </div>
                <Popover.Arrow />
              </Popover.Content>
            </Popover.Root>
          </div>

          {/* Tooltip */}
          <div
            className="astw:rounded-md astw:border astw:border-border astw:p-4"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <span className="astw:text-sm astw:font-medium">Tooltip</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <Button variant="outline" size="icon">
                    <InfoIcon />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content side="top">
                  This is a helpful tooltip
                </Tooltip.Content>
              </Tooltip.Root>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <Button variant="outline" size="sm">
                    Hover me
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom">
                  Tooltip on the bottom
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
          </div>

          {/* PreviewCard */}
          <div
            className="astw:rounded-md astw:border astw:border-border astw:p-4"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <span className="astw:text-sm astw:font-medium">PreviewCard</span>
            <PreviewCard.Root>
              <PreviewCard.Trigger>
                <span className="astw:text-sm astw:text-primary astw:underline astw:cursor-pointer">
                  Hover to preview
                </span>
              </PreviewCard.Trigger>
              <PreviewCard.Content side="bottom">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <span className="astw:text-sm astw:font-semibold">
                    Tailor Platform
                  </span>
                  <span className="astw:text-xs astw:text-muted-foreground">
                    A headless ERP platform for building enterprise
                    applications.
                  </span>
                </div>
                <PreviewCard.Arrow />
              </PreviewCard.Content>
            </PreviewCard.Root>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default OverlaysPage;
