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

  // When there's no component but children exist, add a 404 index route
  // so navigating to the parent path returns 404 instead of a blank page.
  // If a loader (e.g. from guards) exists, run it first so guards like
  // redirectTo() still work. If the guard passes (returns non-Response),
  // fall back to 404 since there's no component to render.
  const notFoundIndex: RouteObject | undefined =
    !indexRoute && children && children.length > 0
      ? {
          index: true,
          // Provide a no-op Component to suppress React Router's warning about
          // a matched leaf route without an element. The loader always throws
          // (404) or redirects, so this component never actually renders.
          Component: () => null,
          loader: source.loader
            ? async (args: Parameters<LoaderHandler>[0]) => {
                const result = await source.loader!(args);
                if (result instanceof Response) return result;
                throw createNotFoundError();
              }
            : () => {
                throw createNotFoundError();
              },
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
            ...(notFoundIndex ? [notFoundIndex] : []),
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
  modules.map((module) => createRoute(module, module.resources, module.errorBoundary));

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
            Component: () => <Navigate to={settingsResources[0].path} relative="path" replace />,
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
