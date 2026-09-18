import { Button, Tooltip } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<Button variant="outline" />}>Hover me</Tooltip.Trigger>
      <Tooltip.Content>Helpful information</Tooltip.Content>
    </Tooltip.Root>
  );
}
