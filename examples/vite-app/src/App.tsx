import {
  AppShell,
  DefaultSidebar,
  SidebarLayout,
  type SearchSource,
} from "@tailor-platform/app-shell";
import { searchOrders } from "./fake-search";

const searchSources: SearchSource[] = [
  {
    prefix: "ORD",
    title: "Orders",
    search: searchOrders,
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
