import type { PropsWithChildren } from "react";
import { AppShellTestingContext } from "@/components/appshell/testing-context";

export type AppShellTestingProviderProps = PropsWithChildren<{
  /** Initial history stack for AppShell's memory router. */
  initialEntries: string[];
}>;

/** Enable memory routing for AppShell and configured WithPages shells in this subtree. */
export const AppShellTestingProvider = ({
  children,
  initialEntries,
}: AppShellTestingProviderProps) => (
  <AppShellTestingContext.Provider value={initialEntries}>
    {children}
  </AppShellTestingContext.Provider>
);
