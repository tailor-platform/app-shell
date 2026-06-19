import { useEffect } from "react";
import { useAppShellConfig } from "@/contexts/appshell-context";
import { useBreadcrumbOverride } from "@/contexts/breadcrumb-context";
import { usePathSegments } from "@/components/dynamic-breadcrumb";

const SEPARATOR = " · ";

/**
 * Keeps `document.title` in sync with the active route.
 *
 * The browser tab reads `"<page> · <app>"`, where:
 * - `<page>` is the last breadcrumb segment for the current path, with any
 *   {@link useOverrideBreadcrumb} override applied — so a detail page that sets
 *   a record name (e.g. an order number) gets it in the tab for free, with no
 *   extra wiring.
 * - `<app>` is the `title` prop passed to `<AppShell>`.
 *
 * Rendered once inside the router (see `createRootRoute`) so it tracks every
 * navigation; consumers never wire titles per page. When neither a page title
 * nor an app title resolves, the static `<title>` from `index.html` is left
 * untouched.
 *
 * @internal
 */
export const DocumentTitle = () => {
  const { title: appTitle } = useAppShellConfig();
  const { basePath, segments } = usePathSegments();
  const { overrides } = useBreadcrumbOverride();

  const leaf = segments.at(-1);
  let pageTitle: string | undefined;
  if (leaf) {
    const leafFullPath = basePath ? `/${basePath}/${leaf.path}` : `/${leaf.path}`;
    pageTitle = overrides.get(leafFullPath) ?? leaf.title;
  }

  const nextTitle = [pageTitle, appTitle].filter(Boolean).join(SEPARATOR);

  useEffect(() => {
    if (nextTitle) document.title = nextTitle;
  }, [nextTitle]);

  return null;
};
