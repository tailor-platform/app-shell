import { LocalAuthDemoApp } from "./LocalAuthDemoApp";
import { RealAuthDemoApp } from "./RealAuthDemoApp";

export const App = () => {
  // This E2E Vite app intentionally serves two test fixtures from one dev server:
  //
  // - `/local-auth/**` mounts the local fake-auth AppShell fixture used by the
  //   routing smoke tests. Those tests need fast, deterministic browser coverage
  //   for auth + router integration without leaving localhost.
  // - every other path mounts the real OAuth fixture used by `auth.spec.ts`,
  //   which verifies the hosted Tailor sign-in round-trip and AI smoke flow.
  //
  // In other words, this pathname check is only a test-fixture switch. It is
  // not AppShell behavior; it just decides which demo app the Playwright test
  // wants to exercise for the current URL.
  const isLocalAuthDemoPath =
    typeof window !== "undefined" && window.location.pathname.startsWith("/local-auth");

  return isLocalAuthDemoPath ? <LocalAuthDemoApp /> : <RealAuthDemoApp />;
};
