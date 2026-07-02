import { ErrorBoundaryComponent, Modules, Resource } from "@/resource";
import { createContext, useContext, type ReactNode } from "react";
import { DefaultErrorBoundary } from "@/components/default-error-boundary";
import {
  DEFAULT_LOCALE,
  detectBrowserLocale,
  detectBrowserFullLocale,
  toLanguageSubtag,
} from "@/lib/i18n";
import { getLocalTimeZone } from "@internationalized/date";

/**
 * Empty interface for module augmentation.
 * Users can extend this to define their own context data type and route parameters.
 *
 * @example
 * ```typescript
 * declare module "@tailor-platform/app-shell" {
 *   interface AppShellRegister {
 *     contextData: {
 *       apiClient: ApiClient;
 *       currentUser: User;
 *     };
 *     routeParams: {
 *       "/": {};
 *       "/dashboard": {};
 *       "/orders/:id": { id: string };
 *     };
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Intentionally empty for declaration merging
export interface AppShellRegister {
  // contextData?: unknown;
  // routeParams?: Record<string, Record<string, string>>;
}

/**
 * Context data type inferred from AppShellRegister.
 * Falls back to Record<string, unknown> if not augmented.
 */
export type ContextData = AppShellRegister extends { contextData: infer T }
  ? T
  : Record<string, unknown>;

/**
 * Route parameters type inferred from AppShellRegister.
 * Falls back to Record<string, Record<string, string>> if not augmented.
 * This is typically set by the generated routes file from vite-plugin.
 */
export type RouteParams = AppShellRegister extends { routeParams: infer T }
  ? T
  : Record<string, Record<string, string>>;

export type RootConfiguration = {
  modules: Modules;
  settingsResources: Resource[];
  basePath?: string;
  errorBoundary: ErrorBoundaryComponent;
  locale: string;
  /** Full BCP-47 tag (e.g. "en-GB") for Intl / date formatting. Falls back to `locale`. */
  resolvedLocale?: string;
  /** IANA timezone (e.g. "America/Los_Angeles"). Used by date/time components. */
  timeZone?: string;
};

export type ConfigurationOptions = {
  modules: Modules;
  settingsResources?: Resource[];
  basePath?: string;
  errorBoundary?: ErrorBoundaryComponent;
  locale?: string;
  timeZone?: string;
};

/**
 * Builds a RootConfiguration object from the provided options.
 * Uses browser locale detection when locale is not specified.
 */
export const buildConfigurations = (options: ConfigurationOptions): RootConfiguration => ({
  modules: options.modules,
  settingsResources: options.settingsResources ?? [],
  errorBoundary: options.errorBoundary ?? <DefaultErrorBoundary />,
  basePath: options.basePath,
  // `locale` is the language subtag used for built-in UI strings (label tables
  // are keyed by language), so normalize a full tag like "ja-JP" → "ja".
  // `resolvedLocale` keeps the full tag for Intl / date formatting.
  locale: options.locale ? toLanguageSubtag(options.locale) : detectBrowserLocale(),
  resolvedLocale: options.locale ?? detectBrowserFullLocale(),
  timeZone: options.timeZone,
});

/**
 * Context for static configuration (title, icon, configurations).
 * Changes to this context will cause RouterContainer to re-render.
 */
type AppShellConfigContextType = {
  title?: string;
  icon?: ReactNode;
  favicon?: string;
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

/**
 * Returns the full BCP-47 locale (e.g. "en-GB") for Intl / date formatting.
 * Also returns the language code (e.g. "en") used for label resolution.
 *
 * Falls back to browser detection when used outside an AppShell.
 */
export const useResolvedLocale = (): { locale: string; language: string } => {
  const { configurations } = useContext(AppShellConfigContext);
  return {
    locale: configurations.resolvedLocale ?? configurations.locale,
    language: configurations.locale,
  };
};

/**
 * Returns the configured IANA timezone (e.g. "America/Los_Angeles").
 * Falls back to the user's local timezone when not configured.
 *
 * Used by date/time components to resolve "today" and for ZonedDateTime values.
 */
export const useTimeZone = (): string => {
  const { configurations } = useContext(AppShellConfigContext);
  return configurations.timeZone ?? getLocalTimeZone();
};
