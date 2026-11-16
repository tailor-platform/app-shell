// Test-only routing setup; prefer the Provider with main's AppShell.
export {
  AppShellTestingProvider,
  type AppShellTestingProviderProps,
} from "./app-shell-testing-provider";
export { AppShell, type TestAppShellProps } from "./legacy";
export { TestRouter, type TestRouterProps } from "./test-router";
