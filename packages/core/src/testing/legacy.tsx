import { AppShell, type AppShellProps } from "@/components/appshell/appshell";
import { AppShellTestingContext } from "@/components/appshell/testing-context";
import type { JSX } from "react";
import type { RouterContainerProps } from "@/routing/router";
import { AppShellTestingProvider } from "./app-shell-testing-provider";

/** @deprecated Use main's AppShellProps and configure routing with AppShellTestingProvider. */
export type TestAppShellProps = AppShellProps & RouterContainerProps;

/** @deprecated Wrap main's AppShell in AppShellTestingProvider instead. */
export const TestAppShell: ((props: TestAppShellProps) => JSX.Element | null) & {
  /** @internal Used by the Vite plugin to inject pages. */
  WithPages: typeof AppShell.WithPages;
} = Object.assign(
  (props: TestAppShellProps) =>
    props.memory ? (
      <AppShellTestingProvider initialEntries={props.initialEntries}>
        <AppShell {...props} />
      </AppShellTestingProvider>
    ) : (
      <AppShellTestingContext.Provider value={null}>
        <AppShell {...props} />
      </AppShellTestingContext.Provider>
    ),
  { WithPages: AppShell.WithPages },
);
