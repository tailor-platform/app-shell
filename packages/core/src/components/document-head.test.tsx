import { render, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, type RootConfiguration } from "@/contexts/appshell-context";
import { BreadcrumbOverrideProvider } from "@/contexts/breadcrumb-context";
import { useOverrideBreadcrumb } from "@/hooks/use-override-breadcrumb";
import { DEFAULT_FAVICON_HREF } from "@/lib/default-favicon";
import { DocumentHead } from "./document-head";

const configurations: RootConfiguration = {
  modules: [],
  settingsResources: [],
  locale: "en",
  errorBoundary: null!,
};

// Registers a breadcrumb override for the current route, like a detail page.
const Override = ({ title }: { title: string }) => {
  useOverrideBreadcrumb(title);
  return null;
};

const headTree = (
  path: string,
  opts: { title?: string; favicon?: string; override?: string } = {},
) => (
  <MemoryRouter initialEntries={[path]}>
    <AppShellConfigContext.Provider
      value={{ title: opts.title, favicon: opts.favicon, configurations }}
    >
      <BreadcrumbOverrideProvider>
        {opts.override ? <Override title={opts.override} /> : null}
        <DocumentHead />
      </BreadcrumbOverrideProvider>
    </AppShellConfigContext.Provider>
  </MemoryRouter>
);

const renderAt = (
  path: string,
  opts: { title?: string; favicon?: string; override?: string } = {},
) => render(headTree(path, opts));

const iconHref = () =>
  document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.getAttribute("href");

const iconType = () =>
  document.querySelector<HTMLLinkElement>("link[data-app-shell-favicon]")?.getAttribute("type");

const appShellIconHref = () =>
  document.querySelector<HTMLLinkElement>("link[data-app-shell-favicon]")?.getAttribute("href");

const appendStaticIcon = (href: string, rel = "icon") => {
  const link = document.createElement("link");
  link.setAttribute("rel", rel);
  link.setAttribute("href", href);
  document.head.appendChild(link);
  return link;
};

describe("DocumentHead", () => {
  beforeEach(() => {
    document.title = "initial";
    document.head.querySelectorAll('link[rel~="icon"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('link[rel~="icon"]').forEach((el) => el.remove());
  });

  it("sets '<page> · <app>' from the leaf segment and app title", async () => {
    renderAt("/orders/123", { title: "My App" });
    // No module mapping, so the leaf title falls back to the decoded segment.
    await waitFor(() => expect(document.title).toBe("123 · My App"));
  });

  it("uses just the page title when no app title is provided", async () => {
    renderAt("/orders/123");
    await waitFor(() => expect(document.title).toBe("123"));
  });

  it("applies a breadcrumb override to the tab title", async () => {
    renderAt("/orders/123", { title: "My App", override: "Order #123" });
    await waitFor(() => expect(document.title).toBe("Order #123 · My App"));
  });

  it("leaves the document title untouched when nothing resolves", async () => {
    renderAt("/");
    // Give React a chance to (not) render a <title>.
    await waitFor(() => expect(appShellIconHref()).toBe(DEFAULT_FAVICON_HREF));
    expect(document.title).toBe("initial");
  });

  it("renders the bundled Tailor favicon by default", async () => {
    renderAt("/orders/123", { title: "My App" });
    await waitFor(() => expect(appShellIconHref()).toBe(DEFAULT_FAVICON_HREF));
  });

  it("respects a host-page favicon when the prop is omitted", async () => {
    appendStaticIcon("/host.ico", "shortcut icon");
    renderAt("/orders/123", { title: "My App" });
    await waitFor(() => expect(iconHref()).toBe("/host.ico"));
    expect(appShellIconHref()).toBeUndefined();
  });

  it("falls back to the default favicon when a managed favicon prop is removed", async () => {
    const view = renderAt("/orders/123", { title: "My App", favicon: "/custom.ico" });
    await waitFor(() => expect(appShellIconHref()).toBe("/custom.ico"));

    view.rerender(headTree("/orders/123", { title: "My App" }));

    await waitFor(() => expect(appShellIconHref()).toBe(DEFAULT_FAVICON_HREF));
  });

  it("renders a consumer-provided favicon", async () => {
    renderAt("/orders/123", { title: "My App", favicon: "/custom.ico" });
    await waitFor(() => expect(appShellIconHref()).toBe("/custom.ico"));
  });

  it("infers type=image/png for the default data URI favicon", async () => {
    renderAt("/orders/123", { title: "My App" });
    await waitFor(() => expect(iconType()).toBe("image/png"));
  });

  it("infers type=image/x-icon for .ico favicons", async () => {
    renderAt("/orders/123", { title: "My App", favicon: "/favicon.ico" });
    await waitFor(() => expect(iconType()).toBe("image/x-icon"));
  });

  it("infers type=image/svg+xml for .svg favicons", async () => {
    renderAt("/orders/123", { title: "My App", favicon: "/favicon.svg" });
    await waitFor(() => expect(iconType()).toBe("image/svg+xml"));
  });

  it("omits type for URLs with no recognized extension", async () => {
    renderAt("/orders/123", { title: "My App", favicon: "/favicon" });
    await waitFor(() => expect(appShellIconHref()).toBe("/favicon"));
    expect(iconType()).toBeNull();
  });
});
