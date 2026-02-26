import type { ComponentType, ReactNode } from "react";
import { RouteObject, Navigate, redirect } from "react-router";
import { EmptyOutlet, SettingsWrapper } from "@/components/content";
import { DefaultErrorBoundary } from "@/components/default-error-boundary";
import {
  Modules,
  Module,
  Resource,
  ErrorBoundaryComponent,
  createNotFoundError,
  LoaderHandler,
  runGuards,
} from "@/resource";

export type RootComponentOption = () => ReactNode;

export const wrapErrorBoundary = (
  element: ErrorBoundaryComponent,
): ComponentType => {
  return () => <>{element}</>;
};

type RouteSource = {
  path: string;
  component?: () => ReactNode;
  loader?: LoaderHandler;
  errorBoundary?: ErrorBoundaryComponent;
};

const createRoute = (
  source: RouteSource,
  children: Array<Resource> | undefined,
  parentErrorBoundary?: ErrorBoundaryComponent,
): RouteObject => {
  const effectiveErrorBoundary = source.errorBoundary || parentErrorBoundary;

  // Guards are applied only to this route's index, not cascading to children
  const indexRoute: RouteObject | undefined = source.component
    ? {
        index: true,
        Component: source.component,
        ...(source.loader && { loader: source.loader }),
      }
    : undefined;

  return {
    path: source.path,
    ...(source.errorBoundary && {
      ErrorBoundary: wrapErrorBoundary(source.errorBoundary),
    }),
    ...(children && children.length > 0
      ? {
          children: [
            ...(indexRoute ? [indexRoute] : []),
            ...children.map((child) =>
              createRoute(child, child.subResources, effectiveErrorBoundary),
            ),
          ],
        }
      : indexRoute
        ? {
            children: [indexRoute],
          }
        : {}),
  };
};

/**
 * Creates a route for a module, handling the case where
 * the module has no component (redirects to first visible resource).
 */
const createModuleRoute = (module: Module): RouteObject => {
  const baseRoute = createRoute(module, module.resources, module.errorBoundary);

  // If module has no component but has resources, add a redirect to the first visible resource
  if (!module.component && module.resources.length > 0) {
    const redirectRoute: RouteObject = {
      index: true,
      // Component is required to suppress React Router's warning about empty leaf routes,
      // even though the loader always redirects and this component will never render.
      Component: () => null,
      loader: async () => {
        // First, check module's own guards (no cascade to children)
        const moduleGuardResult = await runGuards(module.guards);
        if (moduleGuardResult.type === "hidden") {
          throw createNotFoundError();
        }
        if (moduleGuardResult.type === "redirect") {
          return redirect(moduleGuardResult.to);
        }

        // Find the first resource that is not hidden by guards
        for (const resource of module.resources) {
          const result = await runGuards(resource.guards);
          if (result.type === "pass") {
            return redirect(resource.path);
          }
        }
        // If all resources are hidden, hide the module itself
        throw createNotFoundError();
      },
    };
    // Explicitly construct the route to avoid index property conflicts
    const result: RouteObject = {
      path: baseRoute.path,
      children: [redirectRoute, ...(baseRoute.children ?? [])],
    };
    if (baseRoute.ErrorBoundary) {
      result.ErrorBoundary = baseRoute.ErrorBoundary;
    }
    return result;
  }

  return baseRoute;
};

const routesFromModules = (modules: Modules) =>
  modules.map((module) => createModuleRoute(module));

type CreateContentRoutesParams = {
  modules: Modules;
  settingsResources: Array<Resource>;
  rootComponent?: RootComponentOption;
};

export const createContentRoutes = ({
  modules,
  settingsResources,
  rootComponent,
}: CreateContentRoutesParams): Array<RouteObject> => {
  const rootRouteConfig = {
    index: true,
    Component: rootComponent ?? EmptyOutlet,
  };

  const settingsRoutes =
    settingsResources.length > 0
      ? [
          {
            path: "settings",
            index: true,
            Component: () => (
              <Navigate
                to={settingsResources[0].path}
                relative="path"
                replace
              />
            ),
          },
          {
            path: "settings",
            Component: SettingsWrapper,
            children: settingsResources.map((resource) => ({
              path: resource.path,
              Component: resource.component,
              ...(resource.errorBoundary && {
                ErrorBoundary: wrapErrorBoundary(resource.errorBoundary),
              }),
            })),
          },
        ]
      : [];

  return [
    rootRouteConfig,
    {
      children: routesFromModules(modules),
    },
    ...settingsRoutes,
    {
      path: "*",
      loader: () => {
        // Throw so that any configured ErrorBoundary can handle 404s consistently
        throw createNotFoundError();
      },
      // Component is required to suppress React Router's warning about empty leaf routes,
      // even though the loader always throws and this component will never render.
      Component: () => null,
      ErrorBoundary: DefaultErrorBoundary,
    },
  ];
};
