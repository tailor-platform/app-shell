import { Text } from "@tailor-platform/app-shell";

export function BasicUsage() {
  return (
    <div className="flex flex-col gap-1">
      <Text variant="heading-md">Purchase orders</Text>
      <Text className="text-muted-foreground">Orders sent to suppliers this month.</Text>
    </div>
  );
}

export function Roles() {
  return (
    <div className="flex flex-col gap-3">
      {/* The headings render a div so that this specimen is not a document heading. */}
      <Text variant="heading-lg" render={<div />}>
        heading-lg: Purchase orders
      </Text>
      <Text variant="heading-md" render={<div />}>
        heading-md: Line items
      </Text>
      <Text variant="heading-sm" render={<div />}>
        heading-sm: Shipping address
      </Text>
      <Text variant="body-md">body-md: Orders sent to suppliers this month.</Text>
      <Text variant="body-sm">body-sm: Updated 2 hours ago</Text>
      <Text variant="label-md">label-md: Total amount</Text>
      <Text variant="label-sm">label-sm: Draft</Text>
      <Text variant="code-sm">code-sm: PO-2026-0001</Text>
    </div>
  );
}

export function ColorAndModifiers() {
  return (
    <div className="flex flex-col gap-3">
      <Text variant="body-md" className="text-muted-foreground">
        Orders sent this month.
      </Text>
      <Text variant="heading-md" render={<div />} className="leading-none">
        Card title
      </Text>
      <Text variant="label-md" className="tabular-nums">
        1,240.00
      </Text>
    </div>
  );
}
