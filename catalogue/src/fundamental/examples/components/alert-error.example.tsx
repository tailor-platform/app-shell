import { Alert } from "@tailor-platform/app-shell";

export function AlertErrorExample() {
  return (
    <Alert.Root variant="error">
      <Alert.Title>Couldn&apos;t load line items</Alert.Title>
      <Alert.Description>Check your connection and try again.</Alert.Description>
    </Alert.Root>
  );
}
