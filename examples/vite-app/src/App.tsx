import {
  AppShell,
  DefaultSidebar,
  SidebarLayout,
  type SearchSource,
} from "@tailor-platform/app-shell";
import { searchOrders, searchRecentOrders } from "./fake-search";

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
      <SidebarLayout sidebar={<DefaultSidebar />} />
    </AppShell>
  );
};

export default App;
