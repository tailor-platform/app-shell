import { Button } from "@tailor-platform/app-shell";
import { PlusIcon } from "lucide-react";

export function BasicUsage() {
  return (
    <div className="flex gap-2">
      <Button>Click me</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Delete</Button>
    </div>
  );
}

export function Variants() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="default">Primary Action</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Secondary Action</Button>
      <Button variant="secondary">Tertiary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link Style</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex items-center gap-2">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Add">
        <PlusIcon />
      </Button>
    </div>
  );
}
