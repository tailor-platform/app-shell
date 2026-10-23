import { useState } from "react";
import { ItemList, Layout, Link, type AppShellPageProps } from "@tailor-platform/app-shell";
import { Archive, Bell, Folder, Home, List, Package, Settings, ShoppingCart } from "lucide-react";

const ItemListPage = () => {
  const [activeView, setActiveView] = useState("Overview");
  const [notifications, setNotifications] = useState(0);

  return (
    <Layout>
      <Layout.Header title="ItemList" />
      <Layout.Column>
        <p className="mb-6 max-w-2xl text-body-sm text-muted-foreground">
          Compact icon-and-label lists in page content, independent of the Sidebar. Sections stay
          flat, groups expand into indented lists, and each item can be a link or an action. Try
          Tab, Enter, and Space as well as clicking.
        </p>
        <div className="grid max-w-4xl gap-6 md:grid-cols-2">
          <section
            aria-labelledby="item-list-actions-title"
            className="min-w-0 rounded-lg border p-4"
          >
            <h2 id="item-list-actions-title" className="mb-3 text-heading-sm">
              Local actions
            </h2>
            <ItemList.Root aria-label="Workspace views">
              <ItemList.Item
                icon={<Home />}
                isActive={activeView === "Overview"}
                onClick={() => setActiveView("Overview")}
              >
                Overview
              </ItemList.Item>
              <ItemList.Section title="Workspace">
                <ItemList.Item
                  icon={<ShoppingCart />}
                  isActive={activeView === "Orders"}
                  onClick={() => setActiveView("Orders")}
                >
                  Orders
                </ItemList.Item>
                <ItemList.Group title="Products" icon={<Package />}>
                  <ItemList.Item
                    isActive={activeView === "All products"}
                    onClick={() => setActiveView("All products")}
                  >
                    All products
                  </ItemList.Item>
                  <ItemList.Group title="Archives" icon={<Archive />} defaultOpen={false}>
                    <ItemList.Item
                      isActive={activeView === "Archived products"}
                      onClick={() => setActiveView("Archived products")}
                    >
                      Archived products
                    </ItemList.Item>
                  </ItemList.Group>
                </ItemList.Group>
                <ItemList.Item icon={<Folder />} onClick={() => setActiveView("Quarterly report")}>
                  Quarterly report with a deliberately long label to check truncation
                </ItemList.Item>
              </ItemList.Section>
              <ItemList.Separator />
              <ItemList.Item icon={<Bell />} onClick={() => setNotifications((count) => count + 1)}>
                Check notifications
              </ItemList.Item>
              <ItemList.Item icon={<Archive />} disabled>
                Export unavailable
              </ItemList.Item>
            </ItemList.Root>
            <output className="mt-4 block text-body-sm text-muted-foreground">
              Current view: {activeView}. Notification checks: {notifications}.
            </output>
          </section>
          <section
            aria-labelledby="item-list-links-title"
            className="min-w-0 rounded-lg border p-4"
          >
            <h2 id="item-list-links-title" className="mb-3 text-heading-sm">
              Links and linked groups
            </h2>
            <p className="mb-3 text-body-sm text-muted-foreground">
              These links navigate to existing example pages. A linked group keeps navigation and
              expansion as separate controls.
            </p>
            <ItemList.Root aria-label="Example page links">
              <ItemList.Item icon={<Home />} render={<Link to="/dashboard" />}>
                Dashboard
              </ItemList.Item>
              <ItemList.Group
                title="Orders"
                icon={<ShoppingCart />}
                render={<Link to="/dashboard/orders" />}
                defaultOpen={false}
              >
                <ItemList.Item render={<Link to="/dashboard/orders" />}>Order list</ItemList.Item>
                <ItemList.Item render={<Link to="/dashboard/products" />}>
                  Product list
                </ItemList.Item>
              </ItemList.Group>
              <ItemList.Separator />
              <ItemList.Section title="Administration">
                <ItemList.Item icon={<Settings />} render={<Link to="/settings" />}>
                  Settings
                </ItemList.Item>
              </ItemList.Section>
            </ItemList.Root>
          </section>
        </div>
      </Layout.Column>
    </Layout>
  );
};

ItemListPage.appShellPageProps = {
  meta: { title: "ItemList", icon: <List /> },
} satisfies AppShellPageProps;

export default ItemListPage;
