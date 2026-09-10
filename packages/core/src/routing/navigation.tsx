import { Modules, Module, runGuards, Resource } from "@/resource";
import type { ReactNode } from "react";
import { matchRoutes, useRouteLoaderData } from "react-router";
import { Table } from "lucide-react";
import { buildTitleResolver, LocalizedString } from "@/lib/i18n";
import { createContentRoutes, type AppShellRouteHandle } from "@/routing/routes";
import type { NavigatableRoute } from "@/routing/path";

// Nav items produced by the appshell root loader for sidebar rendering
export type NavItem = {
  title: string;
  url: string | undefined;
  icon: ReactNode;
  items: Array<NavItemResource>;
};

export type NavItemResource = {
  title: string;
  url?: string;
  items?: Array<NavItemResource>;
};

const loaderID = "appshell-root-nav";

/**
 * Create a loader for navigation items from modules.
 * These navigation items can be loaded using the `useNavItems` hook.
 */
export const createNavItemsLoader = (props: BuildNavItemsProps) => {
  return {
    loaderID,
    loader: async ({ request }: { request: Request }) => {
      const pathname = new URL(request.url).pathname;
      return {
        navItems: buildNavItems(props),
        commandPaletteRoutes: buildCurrentPathAwareRoutes({
          ...props,
          pathname,
        }),
      };
    },
  };
};

type NavItemsLoaderData = {
  navItems?: Promise<Array<NavItem>>;
  commandPaletteRoutes?: Promise<Array<NavigatableRoute>>;
};

/**
 * Hook to get navigation items from the loader created by `createNavItemsLoader`.
 * Returns undefined if the loader data is not available (e.g., in test environments).
 */
export const useNavItems = () => {
  const loaderData = useRouteLoaderData(loaderID) as NavItemsLoaderData | undefined;
  return loaderData?.navItems;
};

/**
 * Hook to get current-path-aware command palette routes from the root loader.
 * Returns only routes whose dynamic params are already fixed by the current URL.
 */
export const useCommandPaletteRoutes = () => {
  const loaderData = useRouteLoaderData(loaderID) as NavItemsLoaderData | undefined;
  return loaderData?.commandPaletteRoutes;
};

type BuildNavItemsProps = {
  modules: Modules;
  locale: string;
  basePath?: string;
};

/**
 * Build navigation items from modules and their resources considering guards.
 * Excludes routes with param segments (e.g., :id) as they cannot be navigated directly.
 */
const buildNavItems = async (props: BuildNavItemsProps) => {
  const resolveTitle = buildTitleResolver(props.locale);

  const resolvedModules = await Promise.all(
    props.modules.map(async (module) => {
      // Skip param routes at module level
      if (module.path.startsWith(":")) return null;

      const guardResult = await runGuards(module.guards);
      if (guardResult.type !== "pass") return null;

      const visibleResources = await filterVisibleResources(
        module.resources,
        module.path,
        resolveTitle,
      );
      // Skip if no visible resources AND the module itself is not directly navigable
      if (visibleResources.length === 0 && !module.meta.menuItemClickable) return null;

      return { module, resources: visibleResources };
    }),
  );

  return resolvedModules
    .filter((entry) => entry !== null)
    .map(({ module, resources }) => {
      return {
        title: resolveTitle(module.meta.title, module.path),
        url: module.meta.menuItemClickable ? module.path || "/" : undefined,
        icon: module.meta.icon || <Table />,
        items: resources,
      };
    });
};

const filterVisibleResources = async (
  resources: Array<Resource>,
  basePath: string,
  resolveTitle: (title: LocalizedString, path: string) => string,
): Promise<Array<NavItemResource>> => {
  const results = await Promise.all(
    resources.map(async (resource) => {
      // Skip param routes (paths starting with ":")
      if (resource.path.startsWith(":")) return null;

      const guardResult = await runGuards(resource.guards);
      if (guardResult.type !== "pass") return null;

      const resourcePath = `${basePath}/${resource.path}`;
      const resourceTitle = resolveTitle(resource.meta.title, resource.path);
      const hasComponent = resource.component !== undefined;

      // Recursively process subResources
      const subItems = resource.subResources
        ? await filterVisibleResources(resource.subResources, resourcePath, resolveTitle)
        : undefined;

      const hasVisibleSubItems = subItems && subItems.length > 0;

      // Componentless resources without sub-resources are dead-end namespaces
      if (!hasComponent && !hasVisibleSubItems) return null;

      return {
        title: resourceTitle,
        url: hasComponent ? resourcePath : undefined,
        items: hasVisibleSubItems ? subItems : undefined,
      };
    }),
  );

  return results.filter((entry) => entry !== null);
};

const splitPath = (path: string) => path.split("/").filter((segment) => segment !== "");

const normalizePathnameForRoutes = (pathname: string, basePath?: string) => {
  const rawSegments = splitPath(pathname);
  const segments = basePath && rawSegments[0] === basePath ? rawSegments.slice(1) : rawSegments;
  return segments.length > 0 ? `/${segments.join("/")}` : "/";
};

const resolveRelativePathSegments = (
  path: string,
  params: Record<string, string | undefined>,
): Array<string> | null => {
  const segments = splitPath(path);
  const resolvedSegments: Array<string> = [];

  for (const segment of segments) {
    if (!segment.startsWith(":")) {
      resolvedSegments.push(segment);
      continue;
    }

    const paramName = segment.slice(1);
    const value = params[paramName];
    if (value === undefined) return null;
    resolvedSegments.push(value);
  }

  return resolvedSegments;
};

const routePathFromSegments = (segments: Array<string>) => segments.join("/") || "/";

const buildCurrentPathAwareRoutes = async ({
  modules,
  locale,
  basePath,
  pathname,
}: BuildNavItemsProps & { pathname: string }): Promise<Array<NavigatableRoute>> => {
  const resolveTitle = buildTitleResolver(locale);
  const matches = matchRoutes(
    createContentRoutes({ modules, settingsResources: [] }),
    normalizePathnameForRoutes(pathname, basePath),
  );

  if (!matches) return [];

  const routeMap = new Map<string, NavigatableRoute>();
  const nodeMatches = matches
    .map((match) => {
      const handle = match.route.handle as AppShellRouteHandle | undefined;
      if (!handle?.node) return null;
      return {
        node: handle.node,
        params: match.params,
        pathnameBase: routePathFromSegments(splitPath(match.pathnameBase)),
      };
    })
    .filter((match) => match !== null);

  for (const [index, match] of nodeMatches.entries()) {
    if (!match.node.path.includes(":")) continue;

    const breadcrumb = nodeMatches
      .slice(0, index + 1)
      .map(({ node }) => resolveTitle(node.meta.title, node.path));
    const moduleMatch = nodeMatches
      .slice(0, index + 1)
      .toReversed()
      .find(({ node }) => "resources" in node);
    const icon =
      moduleMatch && "resources" in moduleMatch.node ? (
        moduleMatch.node.meta.icon || <Table />
      ) : (
        <Table />
      );

    await collectCurrentPathAwareRoutes({
      node: match.node,
      params: match.params,
      icon,
      baseSegments: splitPath(match.pathnameBase),
      breadcrumb,
      resolveTitle,
      routeMap,
    });
  }

  return [...routeMap.values()];
};

const collectCurrentPathAwareRoutes = async ({
  node,
  params,
  icon,
  baseSegments,
  breadcrumb,
  resolveTitle,
  routeMap,
}: {
  node: Module | Resource;
  params: Record<string, string | undefined>;
  icon: ReactNode;
  baseSegments: Array<string>;
  breadcrumb: Array<string>;
  resolveTitle: (title: LocalizedString, path: string) => string;
  routeMap: Map<string, NavigatableRoute>;
}): Promise<void> => {
  const guardResult = await runGuards(node.guards);
  if (guardResult.type !== "pass") return;

  const isNavigable =
    "resources" in node ? node.meta.menuItemClickable : node.component !== undefined;
  if (isNavigable) {
    const path = routePathFromSegments(baseSegments);
    routeMap.set(path, {
      path,
      title: resolveTitle(node.meta.title, node.path),
      icon,
      breadcrumb,
    });
  }

  const children = "resources" in node ? node.resources : node.subResources;
  if (!children || children.length === 0) return;

  for (const child of children) {
    const childSegments = resolveRelativePathSegments(child.path, params);
    if (!childSegments) continue;

    await collectCurrentPathAwareRoutes({
      node: child,
      params,
      icon,
      baseSegments: [...baseSegments, ...childSegments],
      breadcrumb: [...breadcrumb, resolveTitle(child.meta.title, child.path)],
      resolveTitle,
      routeMap,
    });
  }
};
