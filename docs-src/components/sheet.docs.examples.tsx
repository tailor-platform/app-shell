import { Button, Sheet } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Sheet.Root side="right">
      <Sheet.Trigger render={<Button />}>Open Settings</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title>Settings</Sheet.Title>
          <Sheet.Description>Manage your preferences.</Sheet.Description>
        </Sheet.Header>
        <Sheet.Footer>
          <Sheet.Close render={<Button variant="outline" />}>Close</Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}
