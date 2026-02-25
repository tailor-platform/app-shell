import { capitalCase } from "change-case";
import { parsePath } from "@tailor-platform/app-shell-vite-plugin/parser";
import type { Module, Resource, Guard } from "@/resource";
import { DefaultErrorBoundary } from "@/components/default-error-boundary";
import type { LocalizedString } from "@/lib/i18n";
import type { PageEntry, PageComponent } from "./types";

// ============================================
// Page Tree Building
// ============================================

/**
 * Internal node structure for building the page tree.
 */
type PageNode = {
  path: string;
  fullPath: string;
  component?: PageComponent;
  guards: Guard[];
  children: Map<string, PageNode>;
};

/**
 * Build a tree structure from flat page entries.
 */
function buildPageTree(pages: PageEntry[]): PageNode {
  const root: PageNode = {
    path: "",
    fullPath: "",
    guards: [],
    children: new Map(),
  };

  for (const page of pages) {
    const segments = parsePath(page.path);
    let current = root;
    let currentPath = "";

    for (const segment of segments) {
      if (segment.type === "group") continue;

      currentPath = currentPath
        ? `${currentPath}/${segment.converted}`
        : segment.converted;

      if (!current.children.has(segment.converted)) {
        current.children.set(segment.converted, {
          path: segment.converted,
          fullPath: currentPath,
          guards: [],
          children: new Map(),
        });
      }
      current = current.children.get(segment.converted)!;
    }

    // Attach component and guards to the leaf node
    current.component = page.component;
    current.guards = page.component.appShellPageProps?.guards ?? [];
  }

  return root;
}

// ============================================
// Module/Resource Conversion
// ============================================

/**
 * Get title from page component or generate from path.
 */
function getTitle(
  component: PageComponent | undefined,
  path: string,
): LocalizedString {
  return (
    component?.appShellPageProps?.meta?.title ?? capitalCase(path || "home")
  );
}

/**
 * Convert a page node to a Resource.
 */
function nodeToResource(node: PageNode): Resource {
  const Component = node.component;
  const title = getTitle(Component, node.path);
  const icon = Component?.appShellPageProps?.meta?.icon;
  const loader = Component?.appShellPageProps?.loader;

  // Recursively convert children to subResources
  const subResources: Resource[] = [];
  for (const child of node.children.values()) {
    subResources.push(nodeToResource(child));
  }

  return {
    _type: "resource",
    type: "component",
    path: node.path,
    meta: {
      title,
      icon,
    },
    component: Component ? () => <Component /> : () => null,
    subResources: subResources.length > 0 ? subResources : undefined,
    errorBoundary: <DefaultErrorBoundary />,
    guards: node.guards,
    loader,
  };
}

/**
 * Convert a top-level page node to a Module.
 */
function nodeToModule(node: PageNode): Module {
  const Component = node.component;
  const title = getTitle(Component, node.path);
  const icon = Component?.appShellPageProps?.meta?.icon;
  const loader = Component?.appShellPageProps?.loader;

  // Convert children to resources
  const resources: Resource[] = [];
  for (const child of node.children.values()) {
    resources.push(nodeToResource(child));
  }

  return {
    _type: "module",
    type: "component",
    path: node.path,
    meta: {
      title,
      icon,
      menuItemClickable: Component !== undefined,
    },
    component: Component ? () => <Component /> : undefined,
    resources,
    errorBoundary: <DefaultErrorBoundary />,
    guards: node.guards,
    loader,
  };
}

// ============================================
// Main Conversion Function
// ============================================

/**
 * Convert page entries from virtual module to Module[] format.
 *
 * This function:
 * 1. Builds a tree structure from flat page entries
 * 2. Converts the tree to Module[] format compatible with existing AppShell
 *
 * Note: Guards are NOT inherited from parent pages. Each page must explicitly
 * define its own guards.
 *
 * @example
 * ```tsx
 * // In AppShell internal usage
 * import pages from "virtual:app-shell-pages";
 *
 * const modules = convertPagesToModules(pages);
 * // Use modules with existing routing logic
 * ```
 */
export function convertPagesToModules(pages: PageEntry[]): Module[] {
  if (pages.length === 0) {
    return [];
  }

  // Build tree structure
  const root = buildPageTree(pages);

  // Handle root page specially
  const modules: Module[] = [];

  // If root has a component, create a module for it
  if (root.component) {
    const rootModule = nodeToModule({
      ...root,
      path: "",
      children: new Map(), // Root module doesn't include children as resources
    });
    modules.push(rootModule);
  }

  // Convert top-level children to modules
  for (const child of root.children.values()) {
    modules.push(nodeToModule(child));
  }

  return modules;
}

/**
 * Validate that pages and modules props are not used together.
 *
 * @throws Error if both are provided
 */
export function validateExclusiveRouteConfig(
  hasPages: boolean,
  hasModules: boolean,
): void {
  if (hasPages && hasModules) {
    throw new Error(
      "[app-shell] Cannot use both file-based pages (via Vite plugin) and explicit modules prop. " +
        "Please choose one approach:\n" +
        "  1. Use file-based routing with the Vite plugin (recommended)\n" +
        "  2. Use explicit modules prop without the Vite plugin",
    );
  }

  if (!hasPages && !hasModules) {
    throw new Error(
      "[app-shell] No routes configured. Please either:\n" +
        "  1. Configure the appShellRoutes Vite plugin for file-based routing\n" +
        "  2. Pass modules prop to AppShell",
    );
  }
}
