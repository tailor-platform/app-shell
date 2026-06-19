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

const renderAt = (
  path: string,
  opts: { title?: string; favicon?: string; override?: string } = {},
) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShellConfigContext.Provider
        value={{ title: opts.title, favicon: opts.favicon, configurations }}
      >
        <BreadcrumbOverrideProvider>
          {opts.override ? <Override title={opts.override} /> : null}
          <DocumentHead />
        </BreadcrumbOverrideProvider>
      </AppShellConfigContext.Provider>
    </MemoryRouter>,
  );

const iconHref = () =>
  document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute("href");

describe("DocumentHead", () => {
  beforeEach(() => {
    document.title = "initial";
    document.head.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove());
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
    await waitFor(() => expect(iconHref()).toBe(DEFAULT_FAVICON_HREF));
    expect(document.title).toBe("initial");
  });

  it("renders the bundled Tailor favicon by default", async () => {
    renderAt("/orders/123", { title: "My App" });
    await waitFor(() => expect(iconHref()).toBe(DEFAULT_FAVICON_HREF));
  });

  it("renders a consumer-provided favicon", async () => {
    renderAt("/orders/123", { title: "My App", favicon: "/custom.ico" });
    await waitFor(() => expect(iconHref()).toBe("/custom.ico"));
  });
});
