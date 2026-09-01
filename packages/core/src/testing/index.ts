// Test-only entry point: `@tailor-platform/app-shell/testing`.
//
// Separate from the main entry so memory routing cannot reach an application
// bundle: an app rendering the production `AppShell` with `memory` would look
// correct while the URL bar stopped tracking navigation.

export { TestRouter, type TestRouterProps } from "./test-router";

/**
 * `AppShell`, additionally accepting `memory` / `initialEntries` so a test can
 * mount at a fixed URL without touching `window.location`. Identical otherwise.
 */
export {
  AppShellInternal as AppShell,
  type AppShellInternalProps as TestAppShellProps,
} from "@/components/appshell/appshell";
