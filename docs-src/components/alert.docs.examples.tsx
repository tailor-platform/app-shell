import { Alert } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Alert.Root variant="success">
      <Alert.Title>Saved</Alert.Title>
      <Alert.Description>Your changes have been saved.</Alert.Description>
    </Alert.Root>
  );
}
