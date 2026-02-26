import {
  Modules,
  Resource,
  ErrorBoundaryComponent,
  setContextData,
} from "@/resource";
import { useMemo } from "react";
import { type FC } from "react";
import {
  AppShellConfigContext,
  AppShellDataContext,
  buildConfigurations,
  type ContextData,
} from "@/contexts/appshell-context";
import { RouterContainer } from "@/routing/router";
import { ThemeProvider } from "@/contexts/theme-context";
import { useIsClient } from "@/hooks/use-is-client";
import { convertPagesToModules } from "@/fs-routes/converter";
import type { PageEntry } from "@/fs-routes/types";

type SharedAppShellProps = React.PropsWithChildren<{
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

/**
 * Props for AppShell component.
 *
 * Routes can be configured in two ways:
 * 1. **Automatic (recommended)**: Use the vite-plugin which automatically
 *    configures pages via `AppShell.WithPages()`.
 * 2. **Explicit modules**: Pass the `modules` prop for manual configuration.
 *
 * @example
 * ```tsx
 * // Automatic mode (configured by vite-plugin)
 * import { AppShell } from "@tailor-platform/app-shell";
 *
 * <AppShell title="My App">
 *   <SidebarLayout />
 * </AppShell>
 * ```
 *
 * @example
 * ```tsx
 * // Explicit modules mode
 * import { AppShell, defineModule } from "@tailor-platform/app-shell";
 *
 * <AppShell title="My App" modules={[...]}>
 *   <SidebarLayout />
 * </AppShell>
 * ```
 */
export type AppShellProps = SharedAppShellProps & {
  /**
   * Navigation configuration.
   *
   * When using vite-plugin, this is automatically set via `AppShell.WithPages()`.
   * For manual configuration, pass modules directly.
   */
  modules?: Modules;
};

export const AppShell = (props: AppShellProps) => {
  const clientSide = useIsClient();

  // Set context data for guards (module scope)
  const contextData = (props.contextData ?? {}) as ContextData;
  setContextData(contextData);

  const modules = props.modules;

  // Memoize configurations to prevent unnecessary re-renders
  // configurations will be null if modules is not provided
  const configurations = useMemo(
    () =>
      modules
        ? buildConfigurations({
            modules: modules,
            settingsResources: props.settingsResources,
            basePath: props.basePath,
            errorBoundary: props.errorBoundary,
            locale: props.locale,
          })
        : null,
    [
      modules,
      props.settingsResources,
      props.basePath,
      props.errorBoundary,
      props.locale,
    ],
  );

  // Memoize context values to prevent unnecessary re-renders
  const configValue = useMemo(
    () =>
      configurations
        ? { title: props.title, icon: props.icon, configurations }
        : null,
    [props.title, props.icon, configurations],
  );

  const dataValue = useMemo(
    () => ({ contextData: (props.contextData ?? {}) as ContextData }),
    [props.contextData],
  );

  // Validate that modules are configured - render inline error instead of throwing
  if (!modules || !configValue) {
    const errorMessage =
      "[AppShell] No routes configured. " +
      "Either use the appShellRoutes() vite-plugin for automatic page configuration, " +
      "or pass the 'modules' prop for manual configuration.";

    // Log error for debugging
    console.error(errorMessage);

    // Render inline error UI instead of throwing
    return (
      <div className="astw:flex astw:min-h-screen astw:items-center astw:justify-center astw:bg-background astw:p-4">
        <div className="astw:max-w-md astw:rounded-lg astw:border astw:border-destructive/50 astw:bg-destructive/10 astw:p-6 astw:text-center">
          <h1 className="astw:mb-2 astw:text-lg astw:font-semibold astw:text-destructive">
            Configuration Error
          </h1>
          <p className="astw:text-sm astw:text-muted-foreground">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

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

function withPages(pages: PageEntry[]): FC<AppShellProps> {
  // Convert pages to modules at component creation time (not render time)
  const allModules = convertPagesToModules(pages);

  // Extract root page (path="") and use it as rootComponent
  const rootModule = allModules.find((m) => m.path === "");
  const otherModules = allModules.filter((m) => m.path !== "");

  const WrappedAppShell: FC<AppShellProps> = (props) => {
    return (
      <AppShell
        {...props}
        modules={otherModules}
        rootComponent={props.rootComponent ?? rootModule?.component}
      />
    );
  };

  return WrappedAppShell;
}

/**
 * Create an AppShell component with pages pre-configured.
 *
 * @internal
 * This method is used internally by the vite-plugin to inject pages.
 * Users should not call this directly. Use the vite-plugin for automatic
 * page configuration, or pass the `modules` prop for manual configuration.
 */
AppShell.WithPages = withPages;
