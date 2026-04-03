import { type PropsWithChildren, type ReactNode } from "react";
import {
  Outlet,
  createMemoryRouter,
  createBrowserRouter,
  RouterProvider,
} from "react-router";
import type { LoaderFunctionArgs, RouteObject } from "react-router";
import {
  createContentRoutes,
  RootComponentOption,
  wrapErrorBoundary,
} from "./routes";
import {
  useAppShellConfig,
  type RootConfiguration,
} from "@/contexts/appshell-context";
import { createNavItemsLoader } from "@/routing/navigation";
import type { Guard } from "@/resource";
import {
  useRootRouteContext,
  type RootRouteContextType,
} from "@/contexts/root-route-context";

// ============================================================================
// Root Route
// ============================================================================

/**
 * Create the root route that combines root loader, navigation loading,
 * error boundary, and optional element wrapping into a single RouteObject.
 *
 * When AuthProvider wraps AppShell, rootRouteCtx provides:
 *   - loader: runs before rendering (e.g. OAuth callback, auth status check)
 *   - wrapComponent: wraps the root component (e.g. guard UI while loading)
 * When AuthProvider is not used, rootRouteCtx is null and these are skipped.
 */
const createRootRoute = (params: {
  configurations: RootConfiguration;
  rootRouteCtx: RootRouteContextType | null;
  contentRoutes: Array<RouteObject>;
  children: ReactNode;
}): RouteObject => {
  const { configurations, rootRouteCtx, contentRoutes, children } = params;

  // --- Loader: combine auth callback handling with navigation loading ---
  const rootLoader = rootRouteCtx?.loader ?? null;
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

  // --- Element: apply wrapper when provided (e.g. auth guard) ---
  const wrapComponent = rootRouteCtx?.wrapComponent;
  const element = wrapComponent ? wrapComponent(children) : children;

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
    element,
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

export const RouterContainer = (
  props: PropsWithChildren<RouterContainerProps>,
) => {
  const { rootComponent, children } = props;
  const { configurations } = useAppShellConfig();
  const rootRouteCtx = useRootRouteContext();
  const contentRoutes = createContentRoutes({
    modules: configurations.modules,
    settingsResources: configurations.settingsResources,
    rootComponent,
    rootGuards: props.rootGuards,
  });
  const routes = [
    createRootRoute({ configurations, rootRouteCtx, contentRoutes, children }),
  ] satisfies Array<RouteObject>;

  const basename = configurations.basePath
    ? "/" + configurations.basePath
    : undefined;
  const router = props.memory
    ? createMemoryRouter(routes, {
        basename,
        ...(props.initialEntries
          ? { initialEntries: props.initialEntries }
          : {}),
      })
    : createBrowserRouter(routes, {
        basename,
      });

  return <RouterProvider router={router} />;
};
