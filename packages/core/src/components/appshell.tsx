import {
  Modules,
  Resource,
  ErrorBoundaryComponent,
  setContextData,
} from "@/resource";
import { useEffect, useMemo, useState } from "react";
import {
  AppShellConfigContext,
  AppShellDataContext,
  buildConfigurations,
  type ContextData,
} from "@/contexts/appshell-context";
import { RouterContainer } from "@/routing/router";
import { ThemeProvider } from "@/contexts/theme-context";

export type AppShellProps = React.PropsWithChildren<{
  /**
   * App shell title
   */
  title?: string;

  /**
   * App shell icon
   */
  icon?: React.ReactNode;

  /**
   * Base path for the app shell
   */
  basePath?: string;

  /**
   * A component to be rendered at the root level of AppShell.
   * Use guards with redirectTo() for redirects.
   *
   * @example
   * ```tsx
   * rootComponent: () => <DashboardHome />
   * ```
   */
  rootComponent?: () => React.ReactNode;

  /**
   * Navigation configuration
   */
  modules: Modules;

  /**
   * Settings resources to be included in the settings menu
   */
  settingsResources?: Array<Resource>;

  /**
   * Locale code used for built-in UI strings.
   *
   * If not provided, auto-detects from browser preferences.
   * No browser locale information avilable, "en" used as default.
   */
  locale?: string;

  /**
   * Global error boundary component applied to all routes.
   *
   * When an error occurs in any route component, this component will render.
   * Module and resource-level error boundaries take precedence over this.
   * Use the `useRouteError` hook to access error details within the component.
   *
   * @example
   * ```tsx
   * import { useRouteError } from "@tailor-platform/app-shell";
   *
   * const GlobalErrorBoundary = () => {
   *   const error = useRouteError() as Error;
   *   return (
   *     <div>
   *       <h1>Something went wrong</h1>
   *       <p>{error.message}</p>
   *     </div>
   *   );
   * };
   *
   * <AppShell
   *   modules: [...],
   *   errorBoundary: <GlobalErrorBoundary />,
   * />
   * ```
   */
  errorBoundary?: ErrorBoundaryComponent;

  /**
   * Custom context data accessible from guards and components.
   *
   * Use module augmentation to define the type of context data:
   *
   * @example
   * ```typescript
   * // types.d.ts
   * declare module "@tailor-platform/app-shell" {
   *   interface AppShellRegister {
   *     contextData: {
   *       apiClient: ApiClient;
   *       currentUser: User;
   *     };
   *   }
   * }
   *
   * // App.tsx
   * <AppShell
   *   modules={modules}
   *   contextData={{ apiClient, currentUser }}
   * />
   * ```
   */
  contextData?: ContextData;
}>;

export const AppShell = (props: AppShellProps) => {
  const [clientSide, useClientSide] = useState(false);
  useEffect(function updateClientSideFlag() {
    useClientSide(true);
  }, []);

  // Set context data for guards (module scope)
  const contextData = (props.contextData ?? {}) as ContextData;
  setContextData(contextData);

  // Memoize configurations to prevent unnecessary re-renders
  const configurations = useMemo(
    () =>
      buildConfigurations({
        modules: props.modules,
        settingsResources: props.settingsResources,
        basePath: props.basePath,
        errorBoundary: props.errorBoundary,
        locale: props.locale,
      }),
    [
      props.modules,
      props.settingsResources,
      props.basePath,
      props.errorBoundary,
      props.locale,
    ],
  );

  // Memoize context values to prevent unnecessary re-renders
  const configValue = useMemo(
    () => ({ title: props.title, icon: props.icon, configurations }),
    [props.title, props.icon, configurations],
  );

  const dataValue = useMemo(
    () => ({ contextData: (props.contextData ?? {}) as ContextData }),
    [props.contextData],
  );

  if (!clientSide) return null;

  return (
    <AppShellConfigContext.Provider value={configValue}>
      <AppShellDataContext.Provider value={dataValue}>
        <ThemeProvider defaultTheme="system" storageKey="appshell-ui-theme">
          <RouterContainer rootComponent={props.rootComponent}>
            {props.children}
          </RouterContainer>
        </ThemeProvider>
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>
  );
};
