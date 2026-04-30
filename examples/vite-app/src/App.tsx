import {
  AppShell,
  AuthProvider,
  Button,
  DefaultSidebar,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  useAuth,
  type SearchSource,
} from "@tailor-platform/app-shell";
import { createTestAuthClient } from "@tailor-platform/app-shell/testing";
import { ReceiptText } from "lucide-react";
import { searchOrders, searchRecentOrders } from "./fake-search";
import { labels } from "./i18n-labels";

// Use a test auth client to demonstrate login flow (defaults to unauthenticated)
const authClient = createTestAuthClient();

const LoginScreen = () => {
  const { login } = useAuth();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="text-muted-foreground">Please log in to continue.</p>
        <Button onClick={() => login()}>Log In</Button>
      </div>
    </div>
  );
};

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
    <AuthProvider client={authClient} guardComponent={LoginScreen}>
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
    </AuthProvider>
  );
};

export default App;
