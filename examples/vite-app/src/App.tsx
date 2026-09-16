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
              <SidebarItem to="/settings" />
              <SidebarItem to="/dashboard/panels" />
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
              <SidebarItem to="/showcase/ai-chat" />
              <SidebarItem to="/showcase/document-progress" />
              <SidebarItem to="/showcase/date-picker" />
              <SidebarItem to="/showcase/data-table" />
              <SidebarItem to="/showcase/data-table-lab" />
              <SidebarItem to="/showcase/alert-tokens" />
              <SidebarItem to="/showcase/spinner" />
            </SidebarGroup>
          </SidebarLayout.DefaultSidebar>
        }
      />
    </AppShell>
  );
};

export default App;
