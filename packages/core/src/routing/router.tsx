import { createContext, type PropsWithChildren, type ReactNode, useContext, useMemo } from "react";
import { Outlet, createMemoryRouter, createBrowserRouter, RouterProvider } from "react-router";
import type { LoaderFunctionArgs, RouteObject } from "react-router";
import { createContentRoutes, RootComponentOption, wrapErrorBoundary } from "./routes";
import { useAppShellConfig, type RootConfiguration } from "@/contexts/appshell-context";
import { createNavItemsLoader } from "@/routing/navigation";
import type { Guard } from "@/resource";
import { useRootRouteContext, type RootRouteLoaderFn } from "@/contexts/root-route-context";

// The router should only be recreated when route-defining inputs change.
// The shell element and auth guard wrapper are render-time concerns, so keep
// them in a separate React context instead of baking them into the route tree.
const RootRouteContext = createContext<ReactNode>(null);

const RootRouteElement = () => {
  const shell = useContext(RootRouteContext);
  const rootRouteCtx = useRootRouteContext();

  return rootRouteCtx?.wrapComponent ? rootRouteCtx.wrapComponent(shell) : shell;
};

// ============================================================================
// Root Route
// ============================================================================

/**
 * Create the root route that combines root loader, navigation loading,
 * error boundary, and optional element wrapping into a single RouteObject.
 *
 * When AuthProvider wraps AppShell, rootLoader runs before rendering
 * (e.g. OAuth callback handling). The element wrapper stays outside the
 * route definition so UI-only rerenders do not force router recreation.
 */
const createRootRoute = (params: {
  configurations: RootConfiguration;
  rootLoader: RootRouteLoaderFn | null;
  contentRoutes: Array<RouteObject>;
}): RouteObject => {
  const { configurations, rootLoader, contentRoutes } = params;

  // --- Loader: combine auth callback handling with navigation loading ---
  const { loaderID, loader: navLoader } = createNavItemsLoader({
    modules: configurations.modules,
    locale: configurations.locale,
  });
  const loader = async (args: LoaderFunctionArgs) => {
    if (rootLoader) {
      const result = await rootLoader(new URL(args.request.url));
      if (result) return result;
    }
    return navLoader();
  };

  // --- Children: wrap with error boundary when configured ---
  const globalErrorBoundary = configurations.errorBoundary;
  const routeChildren = globalErrorBoundary
    ? [
        {
          element: <Outlet />,
          ErrorBoundary: wrapErrorBoundary(globalErrorBoundary),
          children: contentRoutes,
        },
      ]
    : contentRoutes;

  return {
    id: loaderID,
    loader,
    element: <RootRouteElement />,
    children: routeChildren,
    // Hydration fallback is unused in CSR-only usage of AppShell.
    // Return null to silence hydration warnings.
    HydrateFallback: () => null,
  };
};

// ============================================================================
// RouterContainer
// ============================================================================

type RouterContainerPropsCommon = {
  rootComponent?: RootComponentOption;
  rootGuards?: Guard[];
};

export type RouterContainerProps =
  | ({
      memory?: false;
    } & RouterContainerPropsCommon)
  | ({
      memory: true;
      initialEntries: Array<string>;
    } & RouterContainerPropsCommon);

export const RouterContainer = (props: PropsWithChildren<RouterContainerProps>) => {
  const { rootComponent, children } = props;
  const { configurations } = useAppShellConfig();
  const rootRouteCtx = useRootRouteContext();
  const rootLoader = rootRouteCtx?.loader ?? null;
  const contentRoutes = useMemo(
    () =>
      createContentRoutes({
        modules: configurations.modules,
        settingsResources: configurations.settingsResources,
        rootComponent,
        rootGuards: props.rootGuards,
      }),
    [configurations.modules, configurations.settingsResources, rootComponent, props.rootGuards],
  );
  const routes = useMemo(
    () =>
      [
        createRootRoute({
          configurations,
          rootLoader,
          contentRoutes,
        }),
      ] satisfies Array<RouteObject>,
    [configurations, rootLoader, contentRoutes],
  );

  const basename = configurations.basePath ? "/" + configurations.basePath : undefined;
  const initialEntries = props.memory ? props.initialEntries : undefined;

  // Keep the router instance stable across auth-driven rerenders. Recreating the
  // router would re-run the root loader for the same location, which can cause
  // OAuth callback URLs to be processed more than once. Still rebuild when
  // route-defining inputs such as routes, basename, or initial entries change.
  const router = useMemo(
    () =>
      props.memory
        ? createMemoryRouter(routes, {
            basename,
            ...(initialEntries ? { initialEntries } : {}),
          })
        : createBrowserRouter(routes, {
            basename,
          }),
    [basename, initialEntries, props.memory, routes],
  );

  return (
    <RootRouteContext.Provider value={children}>
      <RouterProvider router={router} />
    </RootRouteContext.Provider>
  );
};
