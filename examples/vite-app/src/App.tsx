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
            <SidebarGroup title="Showcase">
              <SidebarItem to="/showcase/colors" />
              <SidebarItem to="/showcase/primitives" />
              <SidebarItem to="/showcase/dropdown" />
              <SidebarItem to="/showcase/forms" />
              <SidebarItem to="/showcase/forms/zod-rhf" />
              <SidebarItem to="/showcase/csv-importer" />
              <SidebarItem to="/showcase/metric-card" />
              <SidebarItem to="/showcase/activity-card" />
              <SidebarItem to="/showcase/layouts" />
              <SidebarItem to="/showcase/grid" />
              <SidebarItem to="/showcase/timeline" />
              <SidebarItem to="/dashboard/document-progress" />
              <SidebarItem to="/date-picker" />
              <SidebarItem to="/data-table" />
              <SidebarItem to="/data-table-lab" />
              <SidebarItem to="/alert-tokens" />
            </SidebarGroup>
          </SidebarLayout.DefaultSidebar>
        }
      />
    </AppShell>
  );
};

export default App;
