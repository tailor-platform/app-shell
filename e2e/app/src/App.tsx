import {
  AppShell,
  type AIGatewayClient,
  AppearanceSwitcher,
  AuthProvider,
  Button,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  createAIGatewayClient,
  createAuthClient,
  defineModule,
  defineResource,
  redirectTo,
  useAIChat,
  useAuth,
  useNavigate,
} from "@tailor-platform/app-shell";
import { createFakeAuthClient } from "./fake-auth-client";

const isLocalAuthDemoPath =
  typeof window !== "undefined" && window.location.pathname.startsWith("/local-auth");

const realAuthClient = isLocalAuthDemoPath
  ? null
  : createAuthClient({
      appUri: import.meta.env.VITE_TAILOR_APP_URL,
      clientId: import.meta.env.VITE_TAILOR_CLIENT_ID,
    });

const aiGatewayUrl = isLocalAuthDemoPath ? null : import.meta.env.VITE_TAILOR_AI_GATEWAY_URL;
const aiClient =
  realAuthClient && aiGatewayUrl
    ? createAIGatewayClient({
        gatewayUri: aiGatewayUrl,
        authClient: realAuthClient,
      })
    : null;

const localAuthClient = createFakeAuthClient();

const unavailableAIClient = {
  streamChatCompletion(): AsyncIterable<never> {
    throw new Error("AI Gateway not configured");
  },
} satisfies AIGatewayClient;

const RealAuthGuard = () => {
  const { login } = useAuth();

  return (
    <main data-testid="auth-guard">
      <h1>Sign in required</h1>
      <p>You need to sign in to access this app.</p>
      <Button
        type="button"
        data-testid="login-button"
        onClick={() => {
          void login();
        }}
      >
        Sign in
      </Button>
    </main>
  );
};

const RealAuthenticatedContent = () => {
  const { logout, isAuthenticated } = useAuth();
  const { messages, status, error, sendMessage } = useAIChat({
    client: aiClient ?? unavailableAIClient,
    model: "gpt-4o-mini",
  });
  const aiResponse =
    [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "";

  const runAISmoke = async () => {
    if (!aiClient) {
      return;
    }

    await sendMessage("Reply with exactly PONG. Do not add any other text. PING");
  };

  return (
    <main data-testid="authenticated-content">
      <h1>Authenticated</h1>
      <p data-testid="auth-status">{isAuthenticated ? "Logged in" : "Not logged in"}</p>
      <Button
        type="button"
        data-testid="logout-button"
        onClick={() => {
          void logout();
        }}
      >
        Log out
      </Button>
      <Button
        type="button"
        data-testid="ai-smoke-button"
        disabled={!aiClient || status === "submitted" || status === "streaming"}
        onClick={() => {
          void runAISmoke();
        }}
      >
        Check AI Gateway
      </Button>
      <p data-testid="ai-smoke-status">{status}</p>
      <pre data-testid="ai-smoke-response">{aiResponse}</pre>
      {error ? <pre data-testid="ai-smoke-error">{error.message}</pre> : null}
    </main>
  );
};

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
      <AppearanceSwitcher />
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

const RealAuthApp = () => {
  if (!realAuthClient) {
    return null;
  }

  return (
    <AuthProvider client={realAuthClient} guardComponent={RealAuthGuard}>
      <RealAuthenticatedContent />
    </AuthProvider>
  );
};

const LocalAuthApp = () => {
  return (
    <AuthProvider client={localAuthClient} guardComponent={LocalAuthGuard}>
      <AppShell title="Local Auth Routing" basePath="local-auth" modules={localAuthModules}>
        <SidebarLayout
          header={<SidebarLayout.DefaultHeader actions={<LocalAuthHeaderActions />} />}
          sidebar={<LocalAuthSidebar />}
        />
      </AppShell>
    </AuthProvider>
  );
};

export const App = () => {
  return isLocalAuthDemoPath ? <LocalAuthApp /> : <RealAuthApp />;
};
