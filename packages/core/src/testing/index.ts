// Test-only entry point: `@tailor-platform/app-shell/testing`.
//
export {
  AppShellTestingProvider,
  type AppShellTestingProviderProps,
} from "./app-shell-testing-provider";
export { TestAppShell as AppShell, type TestAppShellProps } from "./legacy";
export { TestRouter, type TestRouterProps } from "./test-router";
export { createMemoryAuthClient, type MemoryAuthClient } from "./memory-auth-client";
export { MemoryAuthProvider, type MemoryAuthProviderProps } from "./memory-auth-provider";
