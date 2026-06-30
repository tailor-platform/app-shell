import {
  type AIGatewayClient,
  AuthProvider,
  createAIGatewayClient,
  createAuthClient,
  useAIChat,
  useAuth,
} from "@tailor-platform/app-shell";

const authClient = createAuthClient({
  appUri: import.meta.env.VITE_TAILOR_APP_URL,
  clientId: import.meta.env.VITE_TAILOR_CLIENT_ID,
});

const aiGatewayUrl = import.meta.env.VITE_TAILOR_AI_GATEWAY_URL;
const aiClient = aiGatewayUrl
  ? createAIGatewayClient({
      gatewayUri: aiGatewayUrl,
      authClient,
    })
  : null;

const unavailableAIClient = {
  async *chatCompletionStream() {
    throw new Error("AI Gateway not configured");
  },
} satisfies AIGatewayClient;

const AuthGuard = () => {
  const { login } = useAuth();

  return (
    <main data-testid="auth-guard">
      <h1>Sign in required</h1>
      <p>You need to sign in to access this app.</p>
      <button
        type="button"
        data-testid="login-button"
        onClick={() => {
          void login();
        }}
      >
        Sign in
      </button>
    </main>
  );
};

const AuthenticatedContent = () => {
  const { logout, isAuthenticated } = useAuth();
  const { messages, status, error, sendMessage } = useAIChat({
    client: aiClient ?? unavailableAIClient,
    model: "gpt-5-mini",
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
      <button
        type="button"
        data-testid="logout-button"
        onClick={() => {
          void logout();
        }}
      >
        Log out
      </button>
      <button
        type="button"
        data-testid="ai-smoke-button"
        disabled={!aiClient || status === "submitted" || status === "streaming"}
        onClick={() => {
          void runAISmoke();
        }}
      >
        Check AI Gateway
      </button>
      <p data-testid="ai-smoke-status">{status}</p>
      <pre data-testid="ai-smoke-response">{aiResponse}</pre>
      {error ? <pre data-testid="ai-smoke-error">{error.message}</pre> : null}
    </main>
  );
};

export const App = () => {
  return (
    <AuthProvider client={authClient} guardComponent={AuthGuard}>
      <AuthenticatedContent />
    </AuthProvider>
  );
};
