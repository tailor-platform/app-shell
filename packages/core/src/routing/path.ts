import { ReactNode } from "react";
import { Resource, Module } from "@/resource";
import { buildTitleResolver } from "@/lib/i18n";

export type NavigatableRoute = {
  path: string;
  title: string;
  icon?: ReactNode;
  /**
   * Breadcrumb titles for hierarchical display (e.g., ["Module", "Resource"])
   */
  breadcrumb: Array<string>;
};

/**
 * Filter routes by search query (case-insensitive).
 * Matches against both title and path.
 */
export function filterRoutes(
  routes: Array<NavigatableRoute>,
  search: string
): Array<NavigatableRoute> {
  if (!search.trim()) return routes;
  const lowerSearch = search.toLowerCase();
  return routes.filter(
    (route) =>
      route.title.toLowerCase().includes(lowerSearch) ||
      route.path.toLowerCase().includes(lowerSearch)
  );
}

/**
 * Function to build a mapping of paths to titles from modules and resources.
 */
const buildPathTitleMapping = (modules: Array<Module>, locale: string) => {
  const resolveTitle = buildTitleResolver(locale);
  return modules.reduce(
    (
      acc: Record<
        string,
        {
          title: string;
          breadcrumbTitle?: string | ((segment: string) => string);
        }
      >,
      module
    ) => {
      const moduleTitle = resolveTitle(module.meta.title, module.path);

      acc[module.path] = {
        title: moduleTitle,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- breadcrumbTitle exists at runtime but not in CommonPageResource type
        breadcrumbTitle: (module.meta as any).breadcrumbTitle,
      };

      const buildResourceMappingRecursively = (
        resources: Array<Resource>,
        basePath: string
      ) => {
        if (!resources || resources.length === 0) return;

        resources.forEach((resource) => {
          const resourcePath = `${basePath}/${resource.path}`;
          const resourceTitle = resolveTitle(
            resource.meta.title,
            resource.path
          );
          acc[resourcePath] = {
            title: resourceTitle,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- breadcrumbTitle exists at runtime but not in CommonPageResource type
            breadcrumbTitle: (resource.meta as any).breadcrumbTitle,
          };

          if (resource.subResources && resource.subResources.length > 0) {
            buildResourceMappingRecursively(
              resource.subResources,
              resourcePath
            );
          }
        });
      };

      if (module.resources && module.resources.length > 0) {
        buildResourceMappingRecursively(module.resources, module.path);
      }

      return acc;
    },
    {}
  );
};

/**
 * Process path segments and return segments with titles.
 */
export function processPathSegments(
  pathname: string,
  basePath: string | undefined,
  modules: Array<Module>,
  locale: string
) {
  const rawSegments = pathname
    .split("/")
    .filter((segment: string) => segment !== "");

  // Drop configured basePath if it prefixes the pathname (basename handling)
  const segments =
    basePath && rawSegments[0] === basePath
      ? rawSegments.slice(1)
      : rawSegments;

  const pathTitleMapping = buildPathTitleMapping(modules, locale);
  const segmentsWithTitle = segments.map((segment, index) => {
    const currentPath = segments.slice(0, index + 1).join("/");

    let mapping = pathTitleMapping[currentPath];
    if (!mapping) {
      const tokenMatchedMapping = Object.entries(pathTitleMapping).find(
        ([path]) => {
          // Replace ":variable" segments with a regex pattern to match any non-slash sequence
          const regexPattern = path
            .split("/")
            .map((part) => (part.startsWith(":") ? "[^/]+" : part))
            .join("/");
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(currentPath);
        }
      )?.[1];
      if (tokenMatchedMapping) mapping = tokenMatchedMapping;
    }
    let title: string;
    if (mapping) {
      if (typeof mapping.breadcrumbTitle === "function") {
        title = mapping.breadcrumbTitle(segment);
      } else if (typeof mapping.breadcrumbTitle === "string") {
        title = mapping.breadcrumbTitle;
      } else {
        title = mapping.title;
      }
    } else {
      title = decodeURIComponent(segment);
    }
    return {
      segment,
      path: currentPath,
      title,
    };
  });

  return {
    basePath: basePath || null,
    segments: segmentsWithTitle,
  };
}
