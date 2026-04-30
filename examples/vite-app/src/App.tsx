import {
  AppShell,
  DefaultSidebar,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  type SearchSource,
} from "@tailor-platform/app-shell";
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
        sidebar={
          <DefaultSidebar>
            <SidebarItem to="/" />
            <SidebarGroup title={labels.t("navMain")}>
              <SidebarItem to="/dashboard" activeMatch="exact" />
              <SidebarItem to="/dashboard/orders" />
            </SidebarGroup>
            <SidebarItem to="/settings" />
          </DefaultSidebar>
        }
      />
    </AppShell>
  );
};

export default App;
