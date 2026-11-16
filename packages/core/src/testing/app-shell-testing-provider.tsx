import type { PropsWithChildren } from "react";
import { AppShellTestingContext } from "@/components/appshell/testing-context";

export type AppShellTestingProviderProps = PropsWithChildren<{
  /** Initial history stack for AppShell's memory router. */
  initialEntries: string[];
}>;

/**
 * Enable memory routing for AppShell, including file-based routing, in this subtree.
 * Use the main-entry AppShell with your test modules and layout.
 *
 * @example
 * ```tsx
 * import { render } from "@testing-library/react";
 * import { AppShell, SidebarLayout } from "@tailor-platform/app-shell";
 * import { AppShellTestingProvider } from "@tailor-platform/app-shell/testing";
 *
 * render(
 *   <AppShellTestingProvider initialEntries={["/orders/A42"]}>
 *     <AppShell modules={modules}>
 *       <SidebarLayout />
 *     </AppShell>
 *   </AppShellTestingProvider>,
 * );
 * ```
 */
export const AppShellTestingProvider = ({
  children,
  initialEntries,
}: AppShellTestingProviderProps) => (
  <AppShellTestingContext.Provider value={initialEntries}>
    {children}
  </AppShellTestingContext.Provider>
);
