// Test-only entry: @tailor-platform/app-shell/testing.
// Production AppShell pins memory routing off so application navigation keeps updating the URL.
// Build this entry with main in one Vite graph to share React Contexts and module-scope guard state.

import { AppShellInternal } from "@/components/appshell/appshell";
import type { AppShell as ProductionAppShell, AppShellProps } from "@tailor-platform/app-shell";
import type { JSX } from "react";
import type { RouterContainerProps } from "@/routing/router";

// Standalone component tests can use TestRouter without mounting the whole shell.
export { TestRouter, type TestRouterProps } from "./test-router";

/** Extend main's props so integration tests can select memory routing and an initial history stack. */
export type TestAppShellProps = AppShellProps & RouterContainerProps;

// Reuse AppShellInternal rather than maintaining a separate test implementation.
// The public type imports load the exact main module that consumers augment, even in testing-only code.
// Keep both props and WithPages tied to that entry so registered contextData and guard types stay intact.
/** AppShell with optional memory routing so integration tests can avoid changing window.location. */
export const AppShell: ((props: TestAppShellProps) => JSX.Element | null) &
  Pick<typeof ProductionAppShell, "WithPages"> = AppShellInternal;
