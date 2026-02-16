import { Modules, runGuards, Resource } from "@/resource";
import type { ReactNode } from "react";
import { LoaderFunctionArgs, useRouteLoaderData } from "react-router";
import { Table } from "lucide-react";
import { buildTitleResolver, LocalizedString } from "@/lib/i18n";

// Nav items produced by the appshell root loader for sidebar rendering
export type NavItem = {
  title: string;
  url: string | undefined;
  icon: ReactNode;
  items: Array<NavItemResource>;
};

export type NavItemResource = {
  title: string;
  url: string;
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
    loader: async (args: LoaderFunctionArgs) => {
      return { navItems: buildNavItems(props, args) };
    },
  };
};

type NavItemsLoaderData = { navItems?: Promise<Array<NavItem>> };

/**
 * Hook to get navigation items from the loader created by `createNavItemsLoader`.
 * Returns undefined if the loader data is not available (e.g., in test environments).
 */
export const useNavItems = () => {
  const loaderData = useRouteLoaderData(loaderID) as
    | NavItemsLoaderData
    | undefined;
  return loaderData?.navItems;
};

type BuildNavItemsProps = {
  modules: Modules;
  locale: string;
};

/**
 * Build navigation items from modules and their resources considering guards.
 * Excludes routes with param segments (e.g., :id) as they cannot be navigated directly.
 */
const buildNavItems = async (
  props: BuildNavItemsProps,
  args: LoaderFunctionArgs,
) => {
  const resolveTitle = buildTitleResolver(props.locale);

  const resolvedModules = await Promise.all(
    props.modules.map(async (module) => {
      // Skip param routes at module level
      if (module.path.startsWith(":")) return null;

      const guardResult = await runGuards(module.guards, args);
      if (guardResult.type !== "pass") return null;

      const visibleResources = await filterVisibleResources(
        module.resources,
        module.path,
        args,
        resolveTitle,
      );
      if (visibleResources.length === 0) return null;

      return { module, resources: visibleResources };
    }),
  );

  return resolvedModules
    .filter((entry) => entry !== null)
    .map(({ module, resources }) => {
      return {
        title: resolveTitle(module.meta.title, module.path),
        url: module.meta.menuItemClickable ? module.path : undefined,
        icon: module.meta.icon || <Table />,
        items: resources,
      };
    });
};

const filterVisibleResources = async (
  resources: Array<Resource>,
  basePath: string,
  args: LoaderFunctionArgs,
  resolveTitle: (title: LocalizedString, path: string) => string,
): Promise<Array<NavItemResource>> => {
  const results = await Promise.all(
    resources.map(async (resource) => {
      // Skip param routes (paths starting with ":")
      if (resource.path.startsWith(":")) return null;

      const guardResult = await runGuards(resource.guards, args);
      if (guardResult.type !== "pass") return null;

      const resourcePath = `${basePath}/${resource.path}`;
      const resourceTitle = resolveTitle(resource.meta.title, resource.path);

      // Recursively process subResources
      const subItems = resource.subResources
        ? await filterVisibleResources(
            resource.subResources,
            resourcePath,
            args,
            resolveTitle,
          )
        : undefined;

      return {
        title: resourceTitle,
        url: resourcePath,
        items: subItems && subItems.length > 0 ? subItems : undefined,
      };
    }),
  );

  return results.filter((entry) => entry !== null);
};
