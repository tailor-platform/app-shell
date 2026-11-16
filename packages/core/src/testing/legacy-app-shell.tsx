import { AppShell as ProductionAppShell, type AppShellProps } from "@/components/appshell/appshell";
import type { JSX } from "react";
import type { RouterContainerProps } from "@/routing/router";
import { AppShellTestingProvider } from "./app-shell-testing-provider";

/** @deprecated Use main's AppShellProps and configure routing with AppShellTestingProvider. */
export type TestAppShellProps = AppShellProps & RouterContainerProps;

/** @deprecated Wrap main's AppShell in AppShellTestingProvider instead. */
export const AppShell: ((props: TestAppShellProps) => JSX.Element | null) &
  Pick<typeof ProductionAppShell, "WithPages"> = Object.assign(
  (props: TestAppShellProps) =>
    props.memory ? (
      <AppShellTestingProvider initialEntries={props.initialEntries}>
        <ProductionAppShell {...props} />
      </AppShellTestingProvider>
    ) : (
      <ProductionAppShell {...props} />
    ),
  { WithPages: ProductionAppShell.WithPages },
);
