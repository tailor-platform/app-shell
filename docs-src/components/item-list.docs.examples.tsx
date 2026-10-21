import { useState } from "react";
import { ItemList, Link, NavLink } from "@tailor-platform/app-shell";
import { Bell, Home, Package, ShoppingCart } from "lucide-react";

export function BasicUsage() {
  const [view, setView] = useState("Overview");
  return (
    <>
      <ItemList.Root aria-label="Workspace">
        <ItemList.Item
          icon={<Home />}
          isActive={view === "Overview"}
          onClick={() => setView("Overview")}
        >
          Overview
        </ItemList.Item>
        <ItemList.Separator />
        <ItemList.Section title="Business">
          <ItemList.Item icon={<ShoppingCart />} onClick={() => setView("Orders")}>
            Orders
          </ItemList.Item>
          <ItemList.Group title="Products" icon={<Package />}>
            <ItemList.Item onClick={() => setView("All products")}>All products</ItemList.Item>
            <ItemList.Item onClick={() => setView("Categories")}>Categories</ItemList.Item>
          </ItemList.Group>
        </ItemList.Section>
      </ItemList.Root>
      <output>Current view: {view}</output>
    </>
  );
}

export function LinksAndActions() {
  const [checks, setChecks] = useState(0);
  const handleCheckNotifications = () => {
    setChecks((count) => count + 1);
  };
  return (
    <>
      <ItemList.Root aria-label="Quick access">
        <ItemList.Item icon={<Home />} render={<a href="https://example.com/help" />}>
          Help center
        </ItemList.Item>
        <ItemList.Item icon={<Bell />} onClick={handleCheckNotifications}>
          Check notifications
        </ItemList.Item>
      </ItemList.Root>
      <output>Notification checks: {checks}</output>
    </>
  );
}

export function AppShellRouting() {
  return (
    <ItemList.Root aria-label="Documentation pages">
      <ItemList.Item render={<Link to="/components/button" />}>Button documentation</ItemList.Item>
      <ItemList.Item render={<NavLink to="/components/item-list" end />}>
        ItemList documentation
      </ItemList.Item>
    </ItemList.Root>
  );
}

export function LinkedGroup() {
  return (
    <ItemList.Root aria-label="Contents">
      <ItemList.Group
        title="Installing"
        render={<a href="#installing" aria-label="Installing" />}
        expandOnClick={false}
      >
        <ItemList.Item render={<a href="#configuration" aria-label="Configuration" />}>
          Configuration
        </ItemList.Item>
      </ItemList.Group>
    </ItemList.Root>
  );
}
