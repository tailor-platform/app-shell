import {
  AppShell,
  DefaultSidebar,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  type SearchSource,
} from "@tailor-platform/app-shell";
import { ReceiptText } from "lucide-react";
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
            <SidebarGroup title={labels.t("navMain")}>
              <SidebarItem to="/dashboard" activeMatch="exact" />
              <SidebarItem to="/dashboard/orders" icon={<ReceiptText />} />
            </SidebarGroup>
            <SidebarItem to="/settings" />
          </DefaultSidebar>
        }
      />
    </AppShell>
  );
};

export default App;
