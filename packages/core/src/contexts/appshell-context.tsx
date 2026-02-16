import { ErrorBoundaryComponent, Modules, Resource } from "@/resource";
import { createContext, useContext, type ReactNode } from "react";
import { DefaultErrorBoundary } from "@/components/default-error-boundary";
import { DEFAULT_LOCALE, detectBrowserLocale } from "@/lib/i18n";

/**
 * Empty interface for module augmentation.
 * Users can extend this to define their own context data type.
 *
 * @example
 * ```typescript
 * declare module "@tailor-platform/app-shell" {
 *   interface AppShellRegister {
 *     contextData: {
 *       apiClient: ApiClient;
 *       currentUser: User;
 *     };
 *   }
 * }
 * ```
 */
export interface AppShellRegister {
  // contextData?: unknown;
}

/**
 * Context data type inferred from AppShellRegister.
 * Falls back to Record<string, unknown> if not augmented.
 */
export type ContextData = AppShellRegister extends { contextData: infer T }
  ? T
  : Record<string, unknown>;

export type RootConfiguration = {
  modules: Modules;
  settingsResources: Resource[];
  basePath?: string;
  errorBoundary: ErrorBoundaryComponent;
  locale: string;
};

export type ConfigurationOptions = {
  modules: Modules;
  settingsResources?: Resource[];
  basePath?: string;
  errorBoundary?: ErrorBoundaryComponent;
  locale?: string;
};

/**
 * Builds a RootConfiguration object from the provided options.
 * Uses browser locale detection when locale is not specified.
 */
export const buildConfigurations = (
  options: ConfigurationOptions,
): RootConfiguration => ({
  modules: options.modules,
  settingsResources: options.settingsResources ?? [],
  errorBoundary: options.errorBoundary ?? <DefaultErrorBoundary />,
  basePath: options.basePath,
  locale: options.locale ?? detectBrowserLocale(),
});

/**
 * Context for static configuration (title, icon, configurations).
 * Changes to this context will cause RouterContainer to re-render.
 */
type AppShellConfigContextType = {
  title?: string;
  icon?: ReactNode;
  configurations: RootConfiguration;
};

export const AppShellConfigContext = createContext<AppShellConfigContextType>({
  configurations: {
    modules: [],
    settingsResources: [],
    locale: DEFAULT_LOCALE,

    // Using null! to avoid circular dependency issues.
    // DefaultErrorBoundary imports useT from i18n-labels, which imports
    // defineI18nLabels from hooks/i18n, which imports useAppShellConfig
    // from this file - creating a circular reference.
    // This default value is never used in practice because AppShell
    // always provides the context via AppShellConfigContext.Provider.
    errorBoundary: null!,
  },
});

/**
 * Context for dynamic data (contextData).
 * Changes to this context will NOT cause RouterContainer to re-render.
 */
type AppShellDataContextType = {
  contextData: ContextData;
};

export const AppShellDataContext = createContext<AppShellDataContextType>({
  contextData: {} as ContextData,
});

/**
 * Hook to access only the static configuration.
 * Use this in components that don't need contextData to avoid unnecessary re-renders.
 */
export const useAppShellConfig = () => {
  return useContext(AppShellConfigContext);
};

/**
 * Hook to access only the dynamic contextData.
 * Use this in components that need contextData.
 */
export const useAppShellData = () => {
  return useContext(AppShellDataContext);
};

/**
 * Hook to access the full AppShell context (both config and data).
 * For better performance, prefer useAppShellConfig() or useAppShellData()
 * depending on what you need, as this hook subscribes to both contexts.
 */
export const useAppShell = () => {
  const config = useContext(AppShellConfigContext);
  const data = useContext(AppShellDataContext);
  return {
    ...config,
    ...data,
  };
};
