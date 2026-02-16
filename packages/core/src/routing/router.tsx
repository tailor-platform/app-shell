import { PropsWithChildren } from "react";
import {
  Outlet,
  createMemoryRouter,
  createBrowserRouter,
  RouterProvider,
} from "react-router";
import {
  createContentRoutes,
  RootComponentOption,
  wrapErrorBoundary,
} from "./routes";
import { useAppShellConfig } from "@/contexts/appshell-context";
import { createNavItemsLoader } from "@/routing/navigation";

type RouterContainerPropsCommon = {
  rootComponent?: RootComponentOption;
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
  const { rootComponent, children } = props;
  const contentRoutes = createContentRoutes({
    modules: configurations.modules,
    settingsResources: configurations.settingsResources,
    rootComponent,
  });
  const globalErrorBoundary = configurations.errorBoundary;
  const { loaderID, loader } = createNavItemsLoader({
    modules: configurations.modules,
    locale: configurations.locale,
  });
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
