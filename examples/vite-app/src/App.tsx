import {
  AppShell,
  GlobalHeaderLayout,
  SidebarGroup,
  SidebarItem,
  SidebarMenuButton,
  SidebarMenuItem,
  type SearchSource,
} from "@tailor-platform/app-shell";
import { BellIcon, LayersIcon } from "lucide-react";
import { searchOrders, searchRecentOrders } from "./fake-search";
import { labels } from "./i18n-labels";
import { headerActions, PanelsBody } from "./panels-body";
import { AssistantProvider } from "./assistant-context";

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

const AppInner = () => {
  return (
    <AppShell title="File-Based Routing Demo" searchSources={searchSources}>
      {/* GlobalHeaderLayout bundles the "global header + icon rail" mode: an
          app-wide top bar over the whole shell and a sidebar that collapses to a
          persistent icon rail (toggle at the bottom-left). */}
      <GlobalHeaderLayout
        header={<GlobalHeaderLayout.DefaultHeader actions={headerActions} />}
        body={<PanelsBody />}
        sidebar={
          <GlobalHeaderLayout.DefaultSidebar>
            {/* A custom sidebar action, composed from the low-level primitives
                so it collapses to an icon (with tooltip) in icon-rail mode,
                exactly like the built-in nav items. */}
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<button type="button" aria-label="Notifications" />}
                tooltip="Notifications"
                onClick={() => alert("Notifications")}
              >
                <BellIcon className="size-4" />
                <span>Notifications</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarItem to="/" />
            <SidebarGroup title={labels.t("navMain")} icon={<LayersIcon />}>
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
          </GlobalHeaderLayout.DefaultSidebar>
        }
      />
    </AppShell>
  );
};

const App = () => (
  <AssistantProvider>
    <AppInner />
  </AssistantProvider>
);

export default App;
