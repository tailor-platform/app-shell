import { Button, Input, Sheet, Text } from "@tailor-platform/app-shell";

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

export function Sizes() {
  const sizes = [
    { size: "sm", label: "Small", width: "384px (24rem) — default" },
    { size: "md", label: "Medium", width: "512px (32rem)" },
    { size: "lg", label: "Large", width: "720px (45rem)" },
    { size: "xl", label: "XL", width: "960px (60rem)" },
    { size: "full", label: "Full", width: "100% width" },
  ] as const;
  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map(({ size, label, width }) => (
        <Sheet.Root key={size} side="right">
          <Sheet.Trigger render={<Button variant="outline" />}>Open {label}</Sheet.Trigger>
          <Sheet.Content size={size}>
            <Sheet.Header>
              <Sheet.Title>{label} sheet</Sheet.Title>
              <Sheet.Description>{width}</Sheet.Description>
            </Sheet.Header>
            <Text.p className="p-4">Resize the viewport to see the panel's maximum width.</Text.p>
          </Sheet.Content>
        </Sheet.Root>
      ))}
    </div>
  );
}

export function Sides() {
  return (
    <div className="flex flex-wrap gap-2">
      {(["right", "left", "top", "bottom"] as const).map((side) => (
        <Sheet.Root key={side} side={side}>
          <Sheet.Trigger render={<Button variant="outline" />}>Open {side}</Sheet.Trigger>
          <Sheet.Content>
            <Sheet.Header>
              <Sheet.Title>Sheet from the {side}</Sheet.Title>
            </Sheet.Header>
            <Text.p className="p-4">Swipe toward the {side} edge to dismiss.</Text.p>
          </Sheet.Content>
        </Sheet.Root>
      ))}
    </div>
  );
}

export function NonModal() {
  return (
    <Sheet.Root side="right" modal={false}>
      <Sheet.Trigger render={<Button />}>Open Inspector</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title>Inspector</Sheet.Title>
        </Sheet.Header>
        <Text.p className="p-4">The page remains interactive without a backdrop.</Text.p>
      </Sheet.Content>
    </Sheet.Root>
  );
}

export function HeaderWithActions() {
  return (
    <Sheet.Root side="right">
      <Sheet.Trigger render={<Button />}>Edit Record</Sheet.Trigger>
      <Sheet.Content size="lg">
        <Sheet.Header action={<Sheet.Close render={<Button size="sm" />}>Done</Sheet.Close>}>
          <Sheet.Title>Edit Customer</Sheet.Title>
        </Sheet.Header>
        <div className="p-4">
          <Input aria-label="Customer name" placeholder="Customer name" />
        </div>
      </Sheet.Content>
    </Sheet.Root>
  );
}

export function FilterPanel() {
  return (
    <Sheet.Root side="right">
      <Sheet.Trigger render={<Button variant="outline" />}>Filters</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title>Filter Orders</Sheet.Title>
          <Sheet.Description>Narrow down orders by criteria.</Sheet.Description>
        </Sheet.Header>
        <div className="p-4 flex flex-col gap-4">
          <Input aria-label="Customer name" placeholder="Customer name" />
          <Input aria-label="Order number" placeholder="Order number" />
        </div>
        <Sheet.Footer>
          <Sheet.Close render={<Button variant="outline" />}>Close</Sheet.Close>
          <Sheet.Close render={<Button />}>Apply Filters</Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}

export function BottomSheet() {
  return (
    <Sheet.Root side="bottom">
      <Sheet.Trigger render={<Button />}>More Options</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title>Actions</Sheet.Title>
        </Sheet.Header>
        <div className="p-4 flex flex-col gap-2">
          <Sheet.Close render={<Button variant="ghost" />}>Edit</Sheet.Close>
          <Sheet.Close render={<Button variant="ghost" />}>Duplicate</Sheet.Close>
          <Sheet.Close render={<Button variant="destructive" />}>Delete</Sheet.Close>
        </div>
      </Sheet.Content>
    </Sheet.Root>
  );
}
