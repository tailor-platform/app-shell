import { Alert, Button, alertVariants } from "@tailor-platform/app-shell";

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

export function SuccessConfirmation() {
  return (
    <Alert.Root variant="success">
      <Alert.Title>Invoice Created</Alert.Title>
      <Alert.Description>Invoice #INV-0042 has been sent to the customer.</Alert.Description>
    </Alert.Root>
  );
}

export function StylingUtility() {
  return (
    <div role="alert" className={`${alertVariants({ variant: "info" })} my-4`}>
      Custom alert container
    </div>
  );
}
