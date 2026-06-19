import { useAppShellConfig } from "@/contexts/appshell-context";
import { useBreadcrumbOverrideOptional } from "@/contexts/breadcrumb-context";
import { usePathSegments } from "@/components/dynamic-breadcrumb";
import { DEFAULT_FAVICON_HREF } from "@/lib/default-favicon";

const SEPARATOR = " · ";

/**
 * Declaratively manages the browser tab's title and favicon for the whole app.
 *
 * - **Title** — `"<page> · <app>"`, where `<page>` is the current breadcrumb
 *   leaf (including any {@link useOverrideBreadcrumb} override, so detail pages
 *   show their record name) and `<app>` is the `title` prop passed to
 *   `<AppShell>`. When neither resolves, no `<title>` is rendered and the
 *   document keeps whatever title it already had.
 * - **Favicon** — the `favicon` prop passed to `<AppShell>`, or the bundled
 *   Tailor default ({@link DEFAULT_FAVICON_HREF}) when omitted.
 *
 * Rendered once inside the router (see `createRootRoute`). React 19 hoists the
 * `<title>`/`<link>` into `<head>` and updates them on every navigation — no
 * imperative `document.title` / head manipulation — and this works in
 * client-only apps, streaming SSR, and Server Components.
 *
 * Consumers should let AppShell own these tags and not *also* declare a static
 * `<title>` / `<link rel="icon">` in `index.html`: React only de-duplicates
 * stylesheets, so a static tag it did not render would coexist with this one.
 *
 * @internal
 */
export const DocumentHead = () => {
  const { title: appTitle, favicon } = useAppShellConfig();
  const { basePath, segments } = usePathSegments();
  const overrides = useBreadcrumbOverrideOptional()?.overrides;

  const leaf = segments.at(-1);
  let pageTitle: string | undefined;
  if (leaf) {
    const leafFullPath = basePath ? `/${basePath}/${leaf.path}` : `/${leaf.path}`;
    pageTitle = overrides?.get(leafFullPath) ?? leaf.title;
  }

  const title = [pageTitle, appTitle].filter(Boolean).join(SEPARATOR);
  const resolvedFavicon = favicon ?? DEFAULT_FAVICON_HREF;

  return (
    <>
      {title ? <title>{title}</title> : null}
      <link rel="icon" href={resolvedFavicon} />
    </>
  );
};
