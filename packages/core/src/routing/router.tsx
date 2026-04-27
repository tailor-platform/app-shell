import { type PropsWithChildren, type ReactNode, useMemo } from "react";
import { Outlet, createMemoryRouter, createBrowserRouter, RouterProvider } from "react-router";
import type { RouteObject } from "react-router";
import { createContentRoutes, wrapErrorBoundary } from "./routes";
import { useAppShellConfig, type RootConfiguration } from "@/contexts/appshell-context";
import { createNavItemsLoader } from "@/routing/navigation";

// ============================================================================
// Root Route
// ============================================================================

/**
 * Create the root route that combines navigation loading and error boundary
 * into a single RouteObject.
 */
const createRootRoute = (params: {
  configurations: RootConfiguration;
  contentRoutes: Array<RouteObject>;
  children: ReactNode;
}): RouteObject => {
  const { configurations, contentRoutes, children } = params;

  // --- Loader: load navigation items ---
  const { loaderID, loader } = createNavItemsLoader({
    modules: configurations.modules,
    locale: configurations.locale,
  });

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
    element: children,
    children: routeChildren,
    // Hydration fallback is unused in CSR-only usage of AppShell.
    // Return null to silence hydration warnings.
    HydrateFallback: () => null,
  };
};

// ============================================================================
// RouterContainer
// ============================================================================

type RouterContainerPropsCommon = {};

export type RouterContainerProps =
  | ({
      memory?: false;
    } & RouterContainerPropsCommon)
  | ({
      memory: true;
      initialEntries: Array<string>;
    } & RouterContainerPropsCommon);

export const RouterContainer = (props: PropsWithChildren<RouterContainerProps>) => {
  const { children } = props;
  const { configurations } = useAppShellConfig();
  const contentRoutes = useMemo(
    () =>
      createContentRoutes({
        modules: configurations.modules,
        settingsResources: configurations.settingsResources,
      }),
    [configurations.modules, configurations.settingsResources],
  );
  const routes = useMemo(
    () =>
      [
        createRootRoute({
          configurations,
          contentRoutes,
          children,
        }),
      ] satisfies Array<RouteObject>,
    [configurations, contentRoutes, children],
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

  return <RouterProvider router={router} />;
};
