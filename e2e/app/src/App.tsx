import { AuthProvider, createAuthClient, useAuth } from "@tailor-platform/app-shell";

const authClient = createAuthClient({
  appUri: import.meta.env.VITE_TAILOR_APP_URL,
  clientId: import.meta.env.VITE_TAILOR_CLIENT_ID,
});

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
