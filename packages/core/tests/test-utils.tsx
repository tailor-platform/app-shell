import type { ReactNode } from "react";
import {
  AppShellConfigContext,
  buildConfigurations,
  type DateInputDateFormat,
} from "@/contexts/appshell-context";

/**
 * Test wrapper that provides AppShellConfigContext for components/hooks
 * that depend on `useAppShellConfig()` (e.g., `useT()` from `defineI18nLabels`).
 */
export function createAppShellWrapper(
  locale = "en",
  options: { dateInputDateFormat?: DateInputDateFormat } = {},
) {
  const configurations = buildConfigurations({
    modules: [],
    locale,
    dateInputDateFormat: options.dateInputDateFormat,
  });

  return function AppShellWrapper({ children }: { children: ReactNode }) {
    return (
      <AppShellConfigContext.Provider value={{ configurations }}>
        {children}
      </AppShellConfigContext.Provider>
    );
  };
}
