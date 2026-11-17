import { Button, Tooltip } from "@tailor-platform/app-shell";
import { PencilIcon } from "lucide-react";

export function BasicUsage() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<Button variant="outline" />}>Hover me</Tooltip.Trigger>
      <Tooltip.Content>Helpful information</Tooltip.Content>
    </Tooltip.Root>
  );
}

export function Placement() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<Button />}>Trigger</Tooltip.Trigger>
      <Tooltip.Content side="right" align="start">
        Appears on the right
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export function IconButton() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<Button size="icon" variant="ghost" />}>
        <PencilIcon />
        <span className="sr-only">Edit</span>
      </Tooltip.Trigger>
      <Tooltip.Content>Edit order</Tooltip.Content>
    </Tooltip.Root>
  );
}
