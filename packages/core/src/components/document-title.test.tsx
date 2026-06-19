import { render, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, type RootConfiguration } from "@/contexts/appshell-context";
import { BreadcrumbOverrideProvider } from "@/contexts/breadcrumb-context";
import { useOverrideBreadcrumb } from "@/hooks/use-override-breadcrumb";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { DocumentTitle } from "./document-title";

const configurations: RootConfiguration = {
  modules: [],
  settingsResources: [],
  locale: DEFAULT_LOCALE,
  errorBoundary: null!,
};

// Registers an override for the current route the same way a detail page would.
const Override = ({ title }: { title: string }) => {
  useOverrideBreadcrumb(title);
  return null;
};

const renderAt = (path: string, title: string | undefined, override?: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShellConfigContext.Provider value={{ title, configurations }}>
        <BreadcrumbOverrideProvider>
          {override ? <Override title={override} /> : null}
          <DocumentTitle />
        </BreadcrumbOverrideProvider>
      </AppShellConfigContext.Provider>
    </MemoryRouter>,
  );

describe("DocumentTitle", () => {
  beforeEach(() => {
    document.title = "initial";
  });

  afterEach(() => {
    cleanup();
  });

  it("sets '<page> · <app>' from the leaf segment and app title", async () => {
    renderAt("/orders/123", "My App");
    // No module mapping, so the leaf title falls back to the decoded segment.
    await waitFor(() => expect(document.title).toBe("123 · My App"));
  });

  it("uses just the page title when no app title is provided", async () => {
    renderAt("/orders/123", undefined);
    await waitFor(() => expect(document.title).toBe("123"));
  });

  it("applies a breadcrumb override to the tab title", async () => {
    renderAt("/orders/123", "My App", "Order #123");
    await waitFor(() => expect(document.title).toBe("Order #123 · My App"));
  });

  it("leaves the static title untouched when nothing resolves", async () => {
    renderAt("/", undefined);
    await waitFor(() => expect(document.title).toBe("initial"));
  });
});
