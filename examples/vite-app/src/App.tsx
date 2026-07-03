import {
  AppShell,
  AppearanceSwitcher,
  Button,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  type SearchSource,
} from "@tailor-platform/app-shell";
import { BellIcon, CircleUserIcon } from "lucide-react";
import { searchOrders, searchRecentOrders } from "./fake-search";
import { labels } from "./i18n-labels";

// Demonstrates multiple search sources in the command palette
const searchSources: SearchSource[] = [
  {
    prefix: "ORD",
    title: "Orders",
    search: searchOrders,
  },
  {
    prefix: "REC",
    title: "Recent Orders",
    search: searchRecentOrders,
  },
];

const App = () => {
  return (
    <AppShell title="File-Based Routing Demo" searchSources={searchSources}>
      <SidebarLayout
        header={
          <SidebarLayout.DefaultHeader
            actions={[
              <Button key="notifications" variant="outline" size="icon" aria-label="Notifications">
                <BellIcon />
              </Button>,
              <Button key="account" variant="outline" size="icon" aria-label="Account">
                <CircleUserIcon />
              </Button>,
              // Opt back into the appearance switcher — `actions` replaces the
              // default right-hand cluster, so include it explicitly to keep it.
              <AppearanceSwitcher key="appearance" />,
            ]}
          />
        }
        sidebar={
          <SidebarLayout.DefaultSidebar>
            <SidebarItem to="/" />
            <SidebarGroup title={labels.t("navMain")}>
              <SidebarItem to="/dashboard" activeMatch="exact" />
              <SidebarItem to="/dashboard/orders" />
              <SidebarItem to="/dashboard/products" />
            </SidebarGroup>
            <SidebarItem to="/settings" />
          </SidebarLayout.DefaultSidebar>
        }
      />
    </AppShell>
  );
};

export default App;
