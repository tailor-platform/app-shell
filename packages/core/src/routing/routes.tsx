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

  // Guards are applied only to this route's index, not cascading to children.
  //
  // When `source.loader` exists without a component, it means guards were attached
  // via `withGuardsLoader()`. In that case we still need an index route so the loader
  // can run (e.g. to redirect or throw 404). `source.loader` is currently only set
  // by `withGuardsLoader()` when guards are present — if that coupling changes in the
  // future this condition should be revisited.
  const indexRoute: RouteObject | undefined = source.component
    ? {
        index: true,
        Component: source.component,
        ...(source.loader && { loader: source.loader }),
      }
    : source.loader
      ? {
          index: true,
          loader: source.loader,
          // Component is required to suppress React Router's warning about empty leaf routes,
          // even though the loader always redirects/throws and this component will never render.
          Component: () => null,
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

const routesFromModules = (modules: Modules) =>
  modules.map((module) =>
    createRoute(module, module.resources, module.errorBoundary),
  );

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
