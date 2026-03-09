import { PropsWithChildren } from "react";
import {
  Outlet,
  createMemoryRouter,
  createBrowserRouter,
  RouterProvider,
} from "react-router";
import type { LoaderFunctionArgs } from "react-router";
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
import { useAuthLoader } from "@/contexts/auth-context";

/**
 * Create a root loader that combines auth callback handling with navigation loading.
 *
 * When AuthProvider wraps AppShell, authLoader is available via useAuthLoader and
 * handles OAuth callback processing and auth status checks before rendering any
 * routes. This runs outside React's lifecycle, avoiding strict mode
 * double-invocation issues.
 *
 * When AuthProvider is not used, authLoader is null and the loader only
 * builds navigation items.
 */
const createRootLoader = (
  configurations: RootConfiguration,
  authLoader: ((requestUrl: URL) => Promise<Response | null>) | null,
) => {
  const { loaderID, loader: navLoader } = createNavItemsLoader({
    modules: configurations.modules,
    locale: configurations.locale,
  });

  return {
    loaderID,
    loader: async (args: LoaderFunctionArgs) => {
      if (authLoader) {
        const result = await authLoader(new URL(args.request.url));
        if (result) return result;
      }
      return navLoader();
    },
  };
};

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
  const { configurations } = useAppShellConfig();
  const authLoader = useAuthLoader();
  const { rootComponent, children } = props;
  const contentRoutes = createContentRoutes({
    modules: configurations.modules,
    settingsResources: configurations.settingsResources,
    rootComponent,
    rootGuards: props.rootGuards,
  });
  const globalErrorBoundary = configurations.errorBoundary;
  const { loaderID, loader } = createRootLoader(configurations, authLoader);
  const routes = [
    {
      id: loaderID,
      loader,
      element: children,
      children: globalErrorBoundary
        ? [
            {
              element: <Outlet />,
              ErrorBoundary: wrapErrorBoundary(globalErrorBoundary),
              children: contentRoutes,
            },
          ]
        : contentRoutes,
      /*
       * Hydration fallback is unused in CSR-only usage of AppShell.
       * return null to silence hydration warnings.
       */
      HydrateFallback: () => null,
    },
  ];
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
