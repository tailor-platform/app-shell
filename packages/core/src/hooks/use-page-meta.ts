import { useAppShellConfig } from "@/contexts/appshell-context";
import { buildLocaleResolver, type LocalizedString } from "@/lib/i18n";
import type { Modules, Resource } from "@/resource";
import type { ReactNode } from "react";

export type PageMeta = {
  title: string;
  icon?: ReactNode;
};

/**
 * Find page meta (title, icon) for a given URL path.
 * Searches through modules and their resources recursively.
 *
 * @param path - URL path to find meta for (e.g., "/products/all")
 * @returns PageMeta if found, null for external links or not found
 */
export const usePageMeta = (path: string): PageMeta | null => {
  const { configurations } = useAppShellConfig();
  const { modules, locale } = configurations;

  // External links don't have page meta
  if (isExternalUrl(path)) {
    return null;
  }

  return findPageMeta(path, modules, locale);
};

/**
 * Check if a URL is external (starts with http:// or https://)
 */
const isExternalUrl = (url: string): boolean => {
  return url.startsWith("http://") || url.startsWith("https://");
};

/**
 * Find page meta by searching modules and resources.
 */
const findPageMeta = (
  targetPath: string,
  modules: Modules,
  locale: string,
): PageMeta | null => {
  const resolve = buildLocaleResolver(locale);

  // Normalize target path (ensure leading slash, remove trailing slash)
  const normalizedTarget = normalizePath(targetPath);

  for (const module of modules) {
    // Normalize module path (add leading slash if not present)
    const modulePath = normalizePath(module.path);

    // Check if target matches module path
    if (matchesPath(normalizedTarget, modulePath)) {
      return {
        title: resolve(module.meta.title, module.path),
        icon: module.meta.icon,
      };
    }

    // Search in module's resources
    const pageMeta = findInResources(
      normalizedTarget,
      modulePath,
      module.resources,
      resolve,
    );
    if (pageMeta) {
      return pageMeta;
    }
  }

  return null;
};

/**
 * Check if a target path matches a pattern path, supporting dynamic segments.
 * Dynamic segments (e.g., ":id") match any non-empty path segment.
 *
 * @example
 * matchesPath("/orders/123", "/orders/:id") // true
 * matchesPath("/orders/123", "/orders/456") // false
 * matchesPath("/orders", "/orders")         // true
 */
const matchesPath = (target: string, pattern: string): boolean => {
  if (target === pattern) return true;

  const targetSegments = target.split("/");
  const patternSegments = pattern.split("/");
  if (targetSegments.length !== patternSegments.length) return false;

  return patternSegments.every(
    (seg, i) => seg.startsWith(":") || seg === targetSegments[i],
  );
};

/**
 * Normalize a path to have a leading slash and no trailing slash.
 */
const normalizePath = (path: string): string => {
  let normalized = path;
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};

/**
 * Recursively search resources for the target path.
 */
const findInResources = (
  targetPath: string,
  basePath: string,
  resources: Array<Resource>,
  resolve: (value: LocalizedString | undefined, fallback: string) => string,
): PageMeta | null => {
  for (const resource of resources) {
    const resourcePath = `${basePath}/${resource.path}`;

    if (matchesPath(targetPath, resourcePath)) {
      return {
        title: resolve(resource.meta.title, resource.path),
        icon: resource.meta.icon,
      };
    }

    // Search in sub-resources
    if (resource.subResources) {
      const subMeta = findInResources(
        targetPath,
        resourcePath,
        resource.subResources,
        resolve,
      );
      if (subMeta) {
        return subMeta;
      }
    }
  }

  return null;
};
