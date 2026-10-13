import { createContext, useContext } from "react";

/**
 * `true` below AppShell's own router, a data router where navigation blockers
 * (`useBlocker`) work. Components that warn before the user leaves a page check
 * it first, so they still render — without the warning — under a plain router.
 *
 * @internal
 */
export const AppShellRouterContext = createContext(false);

/** Whether the component renders below AppShell's own router. @internal */
export function useInAppShellRouter(): boolean {
  return useContext(AppShellRouterContext);
}
