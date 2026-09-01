import {
  Modules,
  Resource,
  ErrorBoundaryComponent,
  Guard,
  setContextData,
  defineModule,
} from "@/resource";
import { useMemo } from "react";
import { type FC } from "react";
import { HouseIcon } from "lucide-react";
import { labels } from "@/i18n-labels";
import {
  AppShellConfigContext,
  AppShellDataContext,
  buildConfigurations,
  type AppInfo,
  type ContextData,
} from "@/contexts/appshell-context";
import { RouterContainer, type RouterContainerProps } from "@/routing/router";
import { ThemeProvider, type ColorTheme } from "@/contexts/theme-context";
import { BreadcrumbOverrideProvider } from "@/contexts/breadcrumb-context";
import { CommandPaletteProvider, type SearchSource } from "@/contexts/command-palette-context";
import { BuiltInCommandPalette } from "@/components/command-palette";
import { useIsClient } from "@/hooks/use-is-client";
import { convertPagesToModules } from "@/fs-routes/converter";
import type { PageEntry } from "@/fs-routes/types";

/**
 * Shared props between `AppShellProps` and the internal `WithPages` wrapper.
 *
 * These props are available regardless of whether routes are configured
 * automatically (via vite-plugin) or manually (via `modules` prop).
 */
type SharedAppShellProps = React.PropsWithChildren<{
  /**
   * App shell title.
   *
   * Also used as the suffix of the browser tab title: AppShell keeps
   * `document.title` in sync with the active page as `"<page> · <title>"`
   * (the page part is the current breadcrumb leaf, including any
   * {@link useOverrideBreadcrumb} override). When omitted, the tab shows just
   * the page title.
   */
  title?: string;

  /**
   * App shell icon
   */
  icon?: React.ReactNode;

  /**
   * Browser-tab favicon href. Accepts anything valid on `<link rel="icon">` —
   * a public-path URL (e.g. `/favicon.ico`) or a data URI. AppShell renders the
   * `<link rel="icon">` for you (React hoists it into `<head>`). When omitted,
   * AppShell preserves any favicon link already declared by the host page and
   * only falls back to the bundled Tailor favicon when none exists.
   *
   * If you pass this prop, prefer not to also declare a static
   * `<link rel="icon">` in `index.html`.
   */
  favicon?: string;

  /**
   * Additional application metadata shown on the built-in `/__appinfo` page.
   *
   * AppShell always includes its own version there; use this prop to append
   * app-defined rows such as environment, release, or commit.
   */
  appInfo?: AppInfo;

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
   * Guards for the root route.
   *
   * When using file-based routing, this is automatically set from
   * the root page's guards via `AppShell.WithPages()`.
   *
   * @example
   * ```tsx
   * import { redirectTo } from "@tailor-platform/app-shell";
   *
   * <AppShell
   *   modules={[...]}
   *   rootGuards={[() => redirectTo("/dashboard")]}
   * />
   * ```
   */
  rootGuards?: Guard[];

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
   * IANA timezone (e.g. "America/Los_Angeles") used by date/time components
   * as the default for resolving "today" and for `ZonedDateTime` values.
   *
   * If not provided, date/time components fall back to the user's local timezone.
   */
  timeZone?: string;

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

  /**
   * Async search sources for the built-in CommandPalette.
   *
   * The CommandPalette (opened via Cmd+K / Ctrl+K, or the sidebar Search
   * button) always searches pages and contextual actions. When
   * `searchSources` is also provided, those async sources are available
   * as prefix-activated search modes.
   *
   * Note: `DefaultSidebar` always renders a Search entry at the top of
   * the navigation menu, regardless of whether this prop is supplied.
   *
   * @example
   * ```tsx
   * <AppShell
   *   modules={modules}
   *   searchSources={[
   *     {
   *       prefix: "PO",
   *       title: "Purchase Orders",
   *       search: async (query, { signal }) => {
   *         const results = await api.searchOrders(query, { signal });
   *         return results.map((o) => ({
   *           key: o.id,
   *           label: o.number,
   *           path: `/orders/${o.id}`,
   *         }));
   *       },
   *     },
   *   ]}
   * />
   * ```
   */
  searchSources?: readonly SearchSource[];

  /**
   * Initial color mode before any value is loaded from localStorage (`appshell-ui-theme`).
   * This is the end-user accessibility preference; does not replace a stored preference.
   *
   * One of **`light`**, **`dark`**, or **`system`** (follows the OS).
   *
   * @default "system"
   */
  defaultColorTheme?: ColorTheme;
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

/**
 * AppShell's props plus the routing mode. Memory routing is absent from the
 * public {@link AppShellProps} so it cannot be shipped by accident; tests reach
 * it via `@tailor-platform/app-shell/testing`, which re-exports this as
 * `TestAppShellProps`.
 */
export type AppShellInternalProps = AppShellProps & RouterContainerProps;

export const AppShellInternal = (props: AppShellInternalProps) => {
  const clientSide = useIsClient();

  // Set context data for guards (module scope)
  const contextData = (props.contextData ?? {}) as ContextData;
  setContextData(contextData);

  const { modules: propsModules, rootComponent, rootGuards } = props;

  // Narrow the union once so the router gets a well-typed pair.
  const routingMode: RouterContainerProps = props.memory
    ? { memory: true, initialEntries: props.initialEntries }
    : { memory: false };

  const modules = useMemo(() => {
    if (!propsModules) return propsModules;

    const hasRootModule = propsModules.some((m) => m.path === "");

    if (hasRootModule) {
      if (rootComponent || rootGuards?.length) {
        console.warn(
          '[AppShell] Both a root module (path="") and rootComponent/rootGuards are provided. ' +
            "The root module takes precedence; rootComponent and rootGuards will be ignored. " +
            "Define guards directly on the root module instead.",
        );
      }
      return propsModules;
    }

    // No explicit root module — synthesize one from rootComponent / rootGuards
    if (rootComponent || rootGuards?.length) {
      return [
        defineModule({
          path: "",
          ...(rootComponent
            ? {
                meta: { title: labels.t("home"), icon: <HouseIcon /> },
                component: () => rootComponent(),
              }
            : { meta: {} }),
          guards: rootGuards,
          resources: [],
        }),
        ...propsModules,
      ];
    }

    return propsModules;
  }, [propsModules, rootComponent, rootGuards]);

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
            timeZone: props.timeZone,
          })
        : null,
    [
      modules,
      props.settingsResources,
      props.basePath,
      props.errorBoundary,
      props.locale,
      props.timeZone,
    ],
  );

  // Memoize context values to prevent unnecessary re-renders
  const configValue = useMemo(
    () =>
      configurations
        ? {
            title: props.title,
            icon: props.icon,
            favicon: props.favicon,
            appInfo: props.appInfo,
            configurations,
          }
        : null,
    [props.title, props.icon, props.favicon, props.appInfo, configurations],
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
          <p className="astw:text-sm astw:text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!clientSide) return null;

  return (
    <AppShellConfigContext.Provider value={configValue}>
      <AppShellDataContext.Provider value={dataValue}>
        <BreadcrumbOverrideProvider>
          <CommandPaletteProvider searchSources={props.searchSources}>
            <ThemeProvider defaultColorTheme={props.defaultColorTheme}>
              <RouterContainer {...routingMode}>
                {props.children}
                <BuiltInCommandPalette />
              </RouterContainer>
            </ThemeProvider>
          </CommandPaletteProvider>
        </BreadcrumbOverrideProvider>
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>
  );
};

/**
 * Create an AppShell component with pages pre-configured.
 *
 * @internal
 * This method is used internally by the vite-plugin to inject pages.
 * Users should not call this directly. Use the vite-plugin for automatic
 * page configuration, or pass the `modules` prop for manual configuration.
 */
AppShellInternal.WithPages = (pages: PageEntry[]): FC<AppShellProps> => {
  // Convert pages to modules at component creation time (not render time)
  const allModules = convertPagesToModules(pages);

  const WrappedAppShell: FC<AppShellProps> = (props) => {
    return <AppShellInternal {...props} modules={allModules} memory={false} />;
  };

  return WrappedAppShell;
};

/**
 * The app shell: providers, routing, and layout for a Tailor application.
 *
 * Always browser routing. `memory` is pinned off rather than merely absent from
 * {@link AppShellProps}, so it holds for JS callers and `any` spreads too;
 * `@tailor-platform/app-shell/testing` is the only way to memory routing.
 */
const AppShellPublic = (props: AppShellProps) => <AppShellInternal {...props} memory={false} />;
AppShellPublic.WithPages = AppShellInternal.WithPages;

export const AppShell: ((props: AppShellProps) => React.ReactNode) & {
  WithPages: (pages: PageEntry[]) => FC<AppShellProps>;
} = AppShellPublic;
