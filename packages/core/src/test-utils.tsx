import type { ReactNode } from "react";
import {
  AppShellConfigContext,
  buildConfigurations,
} from "@/contexts/appshell-context";

/**
 * Test wrapper that provides AppShellConfigContext for components/hooks
 * that depend on `useAppShellConfig()` (e.g., `useT()` from `defineI18nLabels`).
 */
export function createAppShellWrapper(locale = "en") {
  const configurations = buildConfigurations({
    modules: [],
    locale,
  });

  return function AppShellWrapper({ children }: { children: ReactNode }) {
    return (
      <AppShellConfigContext.Provider value={{ configurations }}>
        {children}
      </AppShellConfigContext.Provider>
    );
  };
}
