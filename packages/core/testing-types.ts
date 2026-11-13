import type { AppShell as ProductionAppShell, AppShellProps } from "@tailor-platform/app-shell";
import type { JSX } from "react";
import type { RouterContainerProps } from "./src/routing/router";

export { TestRouter, type TestRouterProps } from "./src/testing/test-router";

export type TestAppShellProps = AppShellProps & RouterContainerProps;

// Keep shared props and WithPages tied to the main entry's augmented types.
export declare const AppShell: ((props: TestAppShellProps) => JSX.Element | null) &
  Pick<typeof ProductionAppShell, "WithPages">;
