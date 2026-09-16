import {
  AppShell,
  AuthProvider,
  Button,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  defineModule,
  defineResource,
  redirectTo,
  useAuth,
  useNavigate,
} from "@tailor-platform/app-shell";
import { createFakeAuthClient } from "./fake-auth-client";

const localAuthClient = createFakeAuthClient();

const OrdersPage = () => {
  const navigate = useNavigate();

  return (
    <main data-testid="local-page-orders">
      <h1>Orders Page</h1>
      <Button
        type="button"
        data-testid="local-go-reports"
        onClick={() => {
          void navigate("../reports");
        }}
      >
        Go to Reports
      </Button>
    </main>
  );
};

const ReportsPage = () => {
  const navigate = useNavigate();

  return (
    <main data-testid="local-page-reports">
      <h1>Reports Page</h1>
      <Button
        type="button"
        data-testid="local-go-orders"
        onClick={() => {
          void navigate("../orders");
        }}
      >
        Go to Orders
      </Button>
    </main>
  );
};

const localAuthModules = [
  defineModule({
    path: "dashboard",
    meta: { title: "Dashboard" },
    resources: [
      defineResource({
        path: "orders",
        meta: { title: "Orders" },
        component: OrdersPage,
      }),
      defineResource({
        path: "reports",
        meta: { title: "Reports" },
        component: ReportsPage,
      }),
    ],
  }),
  defineModule({
    path: "legacy",
    meta: { title: "Legacy" },
    guards: [() => redirectTo("/dashboard/reports")],
    resources: [],
  }),
];

const LocalAuthGuard = () => {
  const { login } = useAuth();

  return (
    <main data-testid="local-auth-guard">
      <h1>Local auth required</h1>
      <Button
        type="button"
        data-testid="local-login-button"
        onClick={() => {
          void login();
        }}
      >
        Sign in
      </Button>
    </main>
  );
};

const LocalAuthHeaderActions = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <>
      <p data-testid="local-auth-status">{isAuthenticated ? "Logged in" : "Not logged in"}</p>
      <Button
        type="button"
        data-testid="local-logout-button"
        variant="outline"
        onClick={() => {
          void logout();
        }}
      >
        Log out
      </Button>
    </>
  );
};

const LocalAuthSidebar = () => {
  return (
    <SidebarLayout.DefaultSidebar>
      <SidebarGroup title="Local auth navigation">
        <SidebarItem to="/dashboard/orders" title="Orders" />
        <SidebarItem to="/dashboard/reports" title="Reports" />
        <SidebarItem to="/legacy" title="Legacy redirect" />
      </SidebarGroup>
    </SidebarLayout.DefaultSidebar>
  );
};

export const App = () => {
  return (
    <AuthProvider client={localAuthClient} guardComponent={LocalAuthGuard}>
      <AppShell title="Local Auth Routing" modules={localAuthModules}>
        <SidebarLayout
          header={<SidebarLayout.DefaultHeader actions={<LocalAuthHeaderActions />} />}
          sidebar={<LocalAuthSidebar />}
        />
      </AppShell>
    </AuthProvider>
  );
};
