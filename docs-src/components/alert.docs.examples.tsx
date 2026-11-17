import { useState } from "react";
import { Alert, Button, Text, alertVariants } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Alert.Root variant="success">
      <Alert.Title>Saved</Alert.Title>
      <Alert.Description>Your changes have been saved.</Alert.Description>
    </Alert.Root>
  );
}

export function Variants() {
  return (
    <div className="flex flex-col gap-3">
      <Alert.Root variant="neutral">
        <Alert.Title>Note</Alert.Title>
        <Alert.Description>General information.</Alert.Description>
      </Alert.Root>
      <Alert.Root variant="success">
        <Alert.Title>Success</Alert.Title>
        <Alert.Description>Operation completed successfully.</Alert.Description>
      </Alert.Root>
      <Alert.Root variant="warning">
        <Alert.Title>Warning</Alert.Title>
        <Alert.Description>Proceed with caution.</Alert.Description>
      </Alert.Root>
      <Alert.Root variant="error">
        <Alert.Title>Error</Alert.Title>
        <Alert.Description>Something went wrong.</Alert.Description>
      </Alert.Root>
      <Alert.Root variant="info">
        <Alert.Title>Info</Alert.Title>
        <Alert.Description>Here is some useful information.</Alert.Description>
      </Alert.Root>
    </div>
  );
}

export function WithAction() {
  return (
    <Alert.Root
      variant="warning"
      action={
        <Button size="sm" variant="outline">
          Review
        </Button>
      }
    >
      <Alert.Title>Review Required</Alert.Title>
      <Alert.Description>This record has pending changes that need review.</Alert.Description>
    </Alert.Root>
  );
}

export function DismissibleAlert() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {dismissed ? (
        <Button variant="outline" onClick={() => setDismissed(false)}>
          Show alert again
        </Button>
      ) : (
        <Alert.Root variant="info" dismissible onDismiss={() => setDismissed(true)}>
          <Alert.Title>New Feature Available</Alert.Title>
          <Alert.Description>Check out the new dashboard layout in Settings.</Alert.Description>
        </Alert.Root>
      )}
      <Text.p role="status">
        {dismissed ? "Alert dismissed." : "Use the close button to dismiss this alert."}
      </Text.p>
    </div>
  );
}

export function WarningWithAction() {
  const [requested, setRequested] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Alert.Root
        variant="warning"
        action={
          <Button size="sm" variant="outline" onClick={() => setRequested(true)}>
            Update Billing
          </Button>
        }
      >
        <Alert.Title>Payment Method Expiring</Alert.Title>
        <Alert.Description>
          Your credit card on file expires at the end of this month.
        </Alert.Description>
      </Alert.Root>
      <Text.p role="status">
        {requested
          ? "Billing settings would open here."
          : "Click Update Billing to try the action."}
      </Text.p>
    </div>
  );
}

export function StylingUtility() {
  return (
    <div role="alert" className={`${alertVariants({ variant: "info" })} my-4`}>
      Custom alert container
    </div>
  );
}
