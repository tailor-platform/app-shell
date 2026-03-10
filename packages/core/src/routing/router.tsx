import { type PropsWithChildren, type ReactNode } from "react";
import { Outlet, createMemoryRouter, createBrowserRouter, RouterProvider } from "react-router";
import type { LoaderFunctionArgs, RouteObject } from "react-router";
import { createContentRoutes, RootComponentOption, wrapErrorBoundary } from "./routes";
import { useAppShellConfig, type RootConfiguration } from "@/contexts/appshell-context";
import { createNavItemsLoader } from "@/routing/navigation";
import type { Guard } from "@/resource";
import { useAuthLoader, useAuth, type AuthLoaderContext } from "@/contexts/auth-context";

// ============================================================================
// Root Route
// ============================================================================

/**
 * Guard component that renders inside the router's root route.
 * Shows the guardComponent when auth is not ready or not authenticated,
 * otherwise renders the children (Outlet).
 */
const AuthGuard = ({
  guardComponent,
  children,
}: {
  guardComponent: () => ReactNode;
  children: ReactNode;
}) => {
  const { isReady, isAuthenticated } = useAuth();
  if (!isReady || !isAuthenticated) {
    return guardComponent();
  }
  return children;
};

/**
 * Create the root route that combines auth, navigation loading, error boundary,
 * and guard UI into a single RouteObject.
 *
 * All auth-related logic (loader composition, AuthGuard wrapping) is scoped
 * to the root route — it is the only route that needs these concerns.
 *
 * When AuthProvider wraps AppShell, authCtx provides:
 *   - loader: runs OAuth callback handling and checkAuthStatus in the router loader
 *   - guardComponent: UI to show while auth is loading or user is unauthenticated
 * When AuthProvider is not used, authCtx is null and auth features are skipped.
 */
const createRootRoute = (params: {
  configurations: RootConfiguration;
  authCtx: AuthLoaderContext | null;
  contentRoutes: Array<RouteObject>;
  children: ReactNode;
}): RouteObject => {
  const { configurations, authCtx, contentRoutes, children } = params;

  // --- Loader: combine auth callback handling with navigation loading ---
  const authLoader = authCtx?.loader ?? null;
  const { loaderID, loader: navLoader } = createNavItemsLoader({
    modules: configurations.modules,
    locale: configurations.locale,
  });
  const loader = async (args: LoaderFunctionArgs) => {
    if (authLoader) {
      const result = await authLoader(new URL(args.request.url));
      if (result) return result;
    }
    return navLoader();
  };

  // --- Element: wrap with AuthGuard when guardComponent is provided ---
  const guardComponent = authCtx?.guardComponent;
  const element = guardComponent ? (
    <AuthGuard guardComponent={guardComponent}>{children}</AuthGuard>
  ) : (
    children
  );

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

export const RouterContainer = (props: PropsWithChildren<RouterContainerProps>) => {
  const { rootComponent, children } = props;
  const { configurations } = useAppShellConfig();
  const authCtx = useAuthLoader();

  const contentRoutes = createContentRoutes({
    modules: configurations.modules,
    settingsResources: configurations.settingsResources,
    rootComponent,
    rootGuards: props.rootGuards,
  });
  const routes = [
    createRootRoute({ configurations, authCtx, contentRoutes, children }),
  ] satisfies Array<RouteObject>;

  const basename = configurations.basePath ? "/" + configurations.basePath : undefined;
  const router = props.memory
    ? createMemoryRouter(routes, {
        basename,
        ...(props.initialEntries ? { initialEntries: props.initialEntries } : {}),
      })
    : createBrowserRouter(routes, {
        basename,
      });

  return <RouterProvider router={router} />;
};
