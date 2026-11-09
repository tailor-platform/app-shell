import { Text } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <div className="flex flex-col gap-1">
      <Text.h2>Purchase orders</Text.h2>
      <Text.p className="text-muted-foreground">Orders sent to suppliers this month.</Text.p>
    </div>
  );
}

export function Roles() {
  return (
    <div className="flex flex-col gap-3">
      {/* The headings render a div so that this specimen is not a document heading. */}
      <Text.div variant="heading-lg">heading-lg: Purchase orders</Text.div>
      <Text.div variant="heading-md">heading-md: Line items</Text.div>
      <Text.div variant="heading-sm">heading-sm: Shipping address</Text.div>
      <Text variant="body-md">body-md: Orders sent to suppliers this month.</Text>
      <Text variant="body-sm">body-sm: Updated 2 hours ago</Text>
      <Text variant="label-md">label-md: Total amount</Text>
      <Text variant="label-sm">label-sm: Draft</Text>
      <Text variant="code-sm">code-sm: PO-2026-0001</Text>
    </div>
  );
}

export function ElementComponents() {
  return (
    <div className="flex flex-col gap-1">
      <Text.h3>Shipping address</Text.h3>
      <Text.p className="text-muted-foreground">Orders ship from the main warehouse.</Text.p>
      <Text.span className="tabular-nums">3 packages</Text.span>
    </div>
  );
}

export function ColorAndModifiers() {
  return (
    <div className="flex flex-col gap-3">
      <Text variant="body-md" className="text-muted-foreground">
        Orders sent this month.
      </Text>
      <Text variant="label-md" className="tabular-nums">
        1,240.00
      </Text>
    </div>
  );
}
