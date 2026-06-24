import { useAppShellConfig } from "@/contexts/appshell-context";
import { useBreadcrumbOverrideOptional } from "@/contexts/breadcrumb-context";
import { usePathSegments } from "@/components/dynamic-breadcrumb";
import { DEFAULT_FAVICON_HREF } from "@/lib/default-favicon";

const SEPARATOR = " · ";
const APP_SHELL_FAVICON_ATTR = "data-app-shell-favicon";

/**
 * Infers the MIME type of a favicon from its href so browsers can prioritise
 * the correct format when multiple icon `<link>` tags are present.
 *
 * Handles data URIs (e.g. `data:image/png;base64,...`) and common file
 * extensions (`.ico`, `.png`, `.svg`). Returns `undefined` for URLs where the
 * type cannot be determined — the browser falls back to its default detection.
 */
const inferFaviconType = (href: string): string | undefined => {
  if (href.startsWith("data:")) {
    const match = href.match(/^data:([^;,]+)/);
    return match?.[1];
  }
  if (href.endsWith(".svg")) return "image/svg+xml";
  if (href.endsWith(".png")) return "image/png";
  if (href.endsWith(".ico")) return "image/x-icon";
  return undefined;
};

/**
 * Declaratively manages the browser tab's title and favicon for the whole app.
 *
 * - **Title** — `"<page> · <app>"`, where `<page>` is the current breadcrumb
 *   leaf (including any {@link useOverrideBreadcrumb} override, so detail pages
 *   show their record name) and `<app>` is the `title` prop passed to
 *   `<AppShell>`. When neither resolves, no `<title>` is rendered and the
 *   document keeps whatever title it already had.
 * - **Favicon** — the `favicon` prop passed to `<AppShell>`. When that prop is
 *   omitted, AppShell preserves any existing host-page `<link rel="icon">`
 *   and only falls back to the bundled Tailor default
 *   ({@link DEFAULT_FAVICON_HREF}) when no favicon exists yet.
 *
 * Rendered once inside the router (see `createRootRoute`). React 19 hoists the
 * `<title>`/`<link>` into `<head>` and updates them on every navigation — no
 * imperative `document.title` / head manipulation — and this works in
 * client-only apps, streaming SSR, and Server Components.
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
  const hasHostPageFavicon =
    typeof document !== "undefined" &&
    document.head.querySelector(`link[rel~="icon"]:not([${APP_SHELL_FAVICON_ATTR}])`);
  const resolvedFavicon = favicon ?? (hasHostPageFavicon ? undefined : DEFAULT_FAVICON_HREF);
  const faviconType = resolvedFavicon ? inferFaviconType(resolvedFavicon) : undefined;

  return (
    <>
      {title ? <title>{title}</title> : null}
      {resolvedFavicon ? (
        <link
          rel="icon"
          href={resolvedFavicon}
          data-app-shell-favicon=""
          {...(faviconType ? { type: faviconType } : {})}
        />
      ) : null}
    </>
  );
};
