import {
  AppShell,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  SidebarMenuButton,
  SidebarMenuItem,
  type SearchSource,
} from "@tailor-platform/app-shell";
import { BellIcon } from "lucide-react";
import { searchOrders, searchRecentOrders } from "./fake-search";
import { labels } from "./i18n-labels";
import { GlobalTopBar, PanelsBody } from "./panels-body";
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
      <SidebarLayout
        // A truly global top bar spanning above the primary sidebar and the
        // content region.
        topBar={<GlobalTopBar />}
        body={<PanelsBody />}
        sidebar={
          // The org title lives in the top bar, so the sidebar drops its own
          // header; its collapse toggle sits at the bottom-left instead.
          <SidebarLayout.DefaultSidebar
            hideHeader
            hideSearch
            iconRail
            footer={
              <div className="mt-auto p-2">
                <SidebarLayout.Trigger />
              </div>
            }
          >
            {/* A custom sidebar action, composed from the low-level primitives
                so it collapses to an icon (with tooltip) in icon-rail mode,
                exactly like the built-in nav items. */}
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<button type="button" />}
                tooltip="Notifications"
                onClick={() => alert("Notifications")}
              >
                <BellIcon className="size-4" />
                <span>Notifications</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
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

const App = () => (
  <AssistantProvider>
    <AppInner />
  </AssistantProvider>
);

export default App;
