import {
  type AIGatewayClient,
  AppShell,
  AuthProvider,
  Button,
  SidebarGroup,
  SidebarItem,
  SidebarLayout,
  createAIGatewayClient,
  createAuthClient,
  defineModule,
  useAIChat,
  useAuth,
} from "@tailor-platform/app-shell";

const appUri = import.meta.env.VITE_TAILOR_APP_URL;
const clientId = import.meta.env.VITE_TAILOR_CLIENT_ID;
const aiGatewayUrl = import.meta.env.VITE_TAILOR_AI_GATEWAY_URL;

const authClient = appUri && clientId ? createAuthClient({ appUri, clientId }) : null;
const aiClient =
  authClient && aiGatewayUrl
    ? createAIGatewayClient({
        gatewayUri: aiGatewayUrl,
        authClient,
      })
    : null;

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

const RealAuthHeaderActions = () => {
  const { logout, isAuthenticated } = useAuth();

  return (
    <>
      <p data-testid="auth-status">{isAuthenticated ? "Logged in" : "Not logged in"}</p>
      <Button
        type="button"
        data-testid="logout-button"
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

const RealAuthSidebar = () => {
  return (
    <SidebarLayout.DefaultSidebar>
      <SidebarGroup title="Real auth navigation">
        <SidebarItem to="/auth" title="Auth" />
        <SidebarItem to="/ai" title="AI Gateway" />
      </SidebarGroup>
    </SidebarLayout.DefaultSidebar>
  );
};

const AuthPage = () => {
  return (
    <main data-testid="authenticated-content">
      <h1>Authenticated</h1>
      <p>Use this page for login, logout, and session persistence checks.</p>
    </main>
  );
};

const AIPage = () => {
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
    <main data-testid="ai-page">
      <h1>AI Gateway</h1>
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

const realAuthModules = [
  defineModule({
    path: "auth",
    meta: { title: "Auth" },
    component: AuthPage,
    resources: [],
  }),
  defineModule({
    path: "ai",
    meta: { title: "AI Gateway" },
    component: AIPage,
    resources: [],
  }),
];

export const App = () => {
  if (!authClient) {
    return (
      <main data-testid="real-auth-config-missing">
        <h1>Real auth demo is not configured</h1>
        <p>Set VITE_TAILOR_APP_URL and VITE_TAILOR_CLIENT_ID to run this suite.</p>
      </main>
    );
  }

  return (
    <AuthProvider client={authClient} guardComponent={RealAuthGuard}>
      <AppShell title="Real Auth" modules={realAuthModules}>
        <SidebarLayout
          header={<SidebarLayout.DefaultHeader actions={<RealAuthHeaderActions />} />}
          sidebar={<RealAuthSidebar />}
        />
      </AppShell>
    </AuthProvider>
  );
};
