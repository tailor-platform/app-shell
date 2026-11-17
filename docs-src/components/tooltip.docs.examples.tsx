import { useState } from "react";
import { Button, Text, Tooltip } from "@tailor-platform/app-shell";
import { PencilIcon } from "lucide-react";

export function SharedDelay() {
  const fields = [
    { name: "Name", help: "Use a name teammates recognize." },
    { name: "Email", help: "Use the address for order updates." },
    { name: "Role", help: "Choose the permissions this person needs." },
  ];

  return (
    <div className="space-y-3">
      <Text.p>Hover the first button for 600 ms, then move directly to another.</Text.p>
      <Tooltip.Provider delay={600}>
        <div className="flex gap-2" role="group" aria-label="Shared-delay help">
          {fields.map((field) => (
            <Tooltip.Root key={field.name}>
              <Tooltip.Trigger render={<Button variant="outline" />}>
                {field.name} help
              </Tooltip.Trigger>
              <Tooltip.Content>{field.help}</Tooltip.Content>
            </Tooltip.Root>
          ))}
        </div>
      </Tooltip.Provider>
    </div>
  );
}

export function ControlledTooltip() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Show tooltip
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Hide tooltip
        </Button>
        <Tooltip.Root open={open} onOpenChange={setOpen}>
          <Tooltip.Trigger render={<Button variant="ghost" />}>Details target</Tooltip.Trigger>
          <Tooltip.Content>Additional details here</Tooltip.Content>
        </Tooltip.Root>
      </div>
      <Text.p role="status">Tooltip: {open ? "open" : "closed"}</Text.p>
    </div>
  );
}

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
