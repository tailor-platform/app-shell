import {
  AppShell,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  type SearchSource,
} from "@tailor-platform/app-shell";
import { searchOrders, searchRecentOrders } from "./fake-search";
import { labels } from "./i18n-labels";
import { PanelsBody } from "./panels-body";

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
        // `body` replaces everything to the right of the sidebar. PanelsBody
        // renders the stock content column via SidebarLayout.ContentContainer
        // (so the header/padding/scrolling are unchanged) and adds page-specific
        // columns beside it on /dashboard/panels. The header that used to live
        // on the `header` prop moved inside PanelsBody.
        body={<PanelsBody />}
        sidebar={
          <SidebarLayout.DefaultSidebar>
            <SidebarItem to="/" />
            <SidebarGroup title={labels.t("navMain")}>
              <SidebarItem to="/dashboard" activeMatch="exact" />
              <SidebarItem to="/dashboard/orders" />
              <SidebarItem to="/dashboard/products" />
              <SidebarItem to="/dashboard/document-progress" />
              <SidebarItem to="/dashboard/panels" />
            </SidebarGroup>
            <SidebarItem to="/date-picker" />
            <SidebarItem to="/data-table" />
            <SidebarItem to="/data-table-lab" />
            <SidebarItem to="/settings" />
          </SidebarLayout.DefaultSidebar>
        }
      />
    </AppShell>
  );
};

export default App;
