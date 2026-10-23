import { useState } from "react";
import { ItemList } from "@tailor-platform/app-shell";
import { Bell, Home, Package, ShoppingCart } from "lucide-react";

export function BasicUsage() {
  return (
    <ItemList.Root aria-label="Workspace">
      <ItemList.Item icon={<Home />} isActive>
        Overview
      </ItemList.Item>
      <ItemList.Separator />
      <ItemList.Section title="Business">
        <ItemList.Item icon={<ShoppingCart />}>Orders</ItemList.Item>
        <ItemList.Group title="Products" icon={<Package />}>
          <ItemList.Item>All products</ItemList.Item>
          <ItemList.Item>Categories</ItemList.Item>
        </ItemList.Group>
      </ItemList.Section>
    </ItemList.Root>
  );
}

export function LinksAndActions() {
  const [checks, setChecks] = useState(0);
  return (
    <>
      <ItemList.Root aria-label="Quick access">
        <ItemList.Item
          icon={<Home />}
          render={<a href="/dashboard" aria-label="Dashboard" aria-current="page" />}
          isActive
        >
          Dashboard
        </ItemList.Item>
        <ItemList.Item icon={<Bell />} onClick={() => setChecks((count) => count + 1)}>
          Check notifications
        </ItemList.Item>
      </ItemList.Root>
      <output>Notification checks: {checks}</output>
    </>
  );
}

export function LinkedGroup() {
  return (
    <ItemList.Root aria-label="Contents">
      <ItemList.Group title="Installing" render={<a href="#installing" aria-label="Installing" />}>
        <ItemList.Item render={<a href="#configuration" aria-label="Configuration" />}>
          Configuration
        </ItemList.Item>
      </ItemList.Group>
    </ItemList.Root>
  );
}
