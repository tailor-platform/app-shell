import type { ComponentType, ReactNode } from "react";
import { RouteObject, Navigate } from "react-router";
import { EmptyOutlet, SettingsWrapper } from "@/components/content";
import { DefaultErrorBoundary } from "@/components/default-error-boundary";
import {
  Modules,
  Resource,
  ErrorBoundaryComponent,
  createNotFoundError,
  LoaderHandler,
} from "@/resource";

export type RootComponentOption = () => ReactNode;

export const wrapErrorBoundary = (element: ErrorBoundaryComponent): ComponentType => {
  return () => <>{element}</>;
};

type RouteSource = {
  path: string;
  component?: () => ReactNode;
  loader?: LoaderHandler;
  errorBoundary?: ErrorBoundaryComponent;
};

/**
 * Resolve the final index route for a given route source.
 *
 * Covers three cases explicitly:
 * 1. has component         → renders the component (with optional guard loader)
 * 2. loader only           → runs guards (e.g. redirectTo); falls back to 404
 *                            if all guards pass
 * 3. no component/loader   → 404 index route (React Router would otherwise
 *                            match the parent and render nothing)
 */
const resolveIndexRoute = (source: RouteSource): RouteObject => {
  if (source.component) {
    return {
      index: true,
      Component: source.component,
      ...(source.loader && { loader: source.loader }),
    };
  }
  if (source.loader) {
    return {
      index: true,
      // No-op component to suppress React Router's warning about a matched
      // leaf route without an element. The loader always throws (404) or
      // returns a redirect Response, so this component never actually renders.
      Component: () => null,
      loader: async (args: Parameters<LoaderHandler>[0]) => {
        const result = await source.loader!(args);
        if (result instanceof Response) return result;
        throw createNotFoundError();
      },
    };
  }
  // No component or guard loader — inject a 404 index route so React Router
  // doesn't match the parent and render nothing (blank page).
  return {
    index: true,
    Component: () => null,
    loader: () => {
      throw createNotFoundError();
    },
  };
};

const createRoute = (
  source: RouteSource,
  children: Array<Resource> | undefined,
  parentErrorBoundary?: ErrorBoundaryComponent,
): RouteObject => {
  const effectiveErrorBoundary = source.errorBoundary || parentErrorBoundary;
  const childRoutes = (children ?? []).map((child) =>
    createRoute(child, child.subResources, effectiveErrorBoundary),
  );
  const indexRoute = resolveIndexRoute(source);
  const allChildren = [indexRoute, ...childRoutes];

  return {
    path: source.path,
    ...(source.errorBoundary && {
      ErrorBoundary: wrapErrorBoundary(source.errorBoundary),
    }),
    ...(allChildren.length > 0 ? { children: allChildren } : {}),
  };
};

const routesFromModules = (modules: Modules) =>
  modules.map((module) => createRoute(module, module.resources, module.errorBoundary));

type CreateContentRoutesParams = {
  modules: Modules;
  settingsResources: Array<Resource>;
  rootComponent?: RootComponentOption;
  rootLoader?: LoaderHandler;
};

export const createContentRoutes = ({
  modules,
  settingsResources,
  rootComponent,
  rootLoader,
}: CreateContentRoutesParams): Array<RouteObject> => {
  const rootRouteConfig = resolveIndexRoute({
    path: "",
    component: rootComponent ?? EmptyOutlet,
    loader: rootLoader,
  });

  const settingsRoutes =
    settingsResources.length > 0
      ? [
          {
            path: "settings",
            index: true,
            Component: () => <Navigate to={settingsResources[0].path} relative="path" replace />,
          },
          {
            path: "settings",
            Component: SettingsWrapper,
            children: settingsResources.map((resource) => {
              // Settings resources are rendered directly without the route
              // resolution logic (resolveIndexRoute), so they always require
              // a component — a component-less settings resource would silently
              // produce a blank page.
              if (!resource.component) {
                throw new Error(`Settings resource "${resource.path}" must have a component.`);
              }
              return {
                path: resource.path,
                Component: resource.component,
                ...(resource.errorBoundary && {
                  ErrorBoundary: wrapErrorBoundary(resource.errorBoundary),
                }),
              };
            }),
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
