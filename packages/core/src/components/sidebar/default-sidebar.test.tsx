import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, assert, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { SidebarProvider } from "./primitives";
import { AppShellConfigContext, type RootConfiguration } from "@/contexts/appshell-context";
import { CommandPaletteProvider } from "@/contexts/command-palette-context";
import { DefaultSidebar } from "./default-sidebar";
import { SidebarLayout } from "./sidebar-layout";
import { SidebarItem } from "./sidebar-item";
import { SidebarGroup } from "./sidebar-group";
import { SidebarSeparator } from "./sidebar-separator";
import { defineModule, defineResource } from "@/resource";
import { AppShell } from "@/components/appshell";
import { useURLCollectionVariables } from "@/lib/collection-url-state";
import { useEffect } from "react";
import { Home, Package } from "lucide-react";
import { DefaultErrorBoundary } from "@/components/internals/default-error-boundary";

const mockNavigatorPlatform = (platform: string) =>
  vi.spyOn(window.navigator, "platform", "get").mockReturnValue(platform);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const createTestModules = () => [
  defineModule({
    path: "dashboard",
    meta: { title: "Dashboard", icon: <Home /> },
    component: () => <div>Dashboard Root</div>,
    resources: [
      defineResource({
        path: "overview",
        meta: { title: "Overview" },
        component: () => <div>Overview</div>,
      }),
    ],
  }),
  defineModule({
    path: "products",
    meta: { title: "Products", icon: <Package /> },
    component: () => <div>Products Root</div>,
    resources: [
      defineResource({
        path: "all",
        meta: { title: "All Products" },
        component: () => <div>All Products</div>,
      }),
    ],
  }),
];

const testConfig: RootConfiguration = {
  modules: createTestModules(),
  settingsResources: [],
  locale: "en",
  errorBoundary: <DefaultErrorBoundary />,
};

/**
 * Wrapper to render DefaultSidebar with all required providers.
 */
const renderDefaultSidebar = (children: React.ReactNode, initialPath = "/dashboard/overview") => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
        <CommandPaletteProvider>
          <SidebarProvider>
            <DefaultSidebar>{children}</DefaultSidebar>
          </SidebarProvider>
        </CommandPaletteProvider>
      </AppShellConfigContext.Provider>
    </MemoryRouter>,
  );
};

const QuerySyncedOrdersPage = () => {
  const { control } = useURLCollectionVariables({ params: { pageSize: 20 } });

  useEffect(() => {
    control.setPageSize(5);
    // one-time seed for the regression; re-running would just re-set the same page size
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div>Orders Page</div>;
};

describe("DefaultSidebar", () => {
  it("renders an input-like search entry with mac shortcut hint, spacing, and opens the palette", async () => {
    const user = userEvent.setup();
    mockNavigatorPlatform("MacIntel");

    render(
      <AppShell title="Test" modules={createTestModules()}>
        <SidebarLayout />
      </AppShell>,
    );

    const searchButton = await screen.findByRole("button", { name: /search/i });
    expect(searchButton.textContent).toContain("Search pages...");
    expect(searchButton.textContent).toContain("⌘K");
    expect(searchButton.textContent).not.toContain("Ctrl+K");
    expect(searchButton.className).toContain("astw:h-8");
    expect(searchButton.className).toContain("astw:text-xs");
    expect(searchButton.closest("li")?.className).toContain("astw:pb-2");

    await user.click(searchButton);

    expect(await screen.findByPlaceholderText("Search pages...")).toBeDefined();
  });

  it("renders windows shortcut hint on non-mac platforms", async () => {
    mockNavigatorPlatform("Win32");

    render(
      <AppShell title="Test" modules={createTestModules()}>
        <SidebarLayout />
      </AppShell>,
    );

    const searchButton = await screen.findByRole("button", { name: /search/i });
    expect(searchButton.textContent).toContain("Ctrl+K");
    expect(searchButton.textContent).not.toContain("⌘K");
  });

  it("renders children instead of auto-generated nav", () => {
    renderDefaultSidebar(
      <>
        <SidebarItem to="/dashboard" />
        <SidebarItem to="/products" />
      </>,
    );

    // Children should be rendered
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /products/i })).toBeDefined();
  });

  it("renders complex children with groups and separators", () => {
    renderDefaultSidebar(
      <>
        <SidebarGroup title="Main">
          <SidebarItem to="/dashboard" />
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup title="Settings">
          <SidebarItem to="/products" />
        </SidebarGroup>
      </>,
    );

    expect(screen.getByText("Main")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /products/i })).toBeDefined();
  });

  it("keeps explicit sidebar navigation working after a page writes search params", async () => {
    const modules = [
      defineModule({
        path: "dashboard",
        meta: { title: "Dashboard", icon: <Home /> },
        component: () => <div>Dashboard Root</div>,
        resources: [
          defineResource({
            path: "orders",
            meta: { title: "Orders" },
            component: QuerySyncedOrdersPage,
          }),
        ],
      }),
    ];

    window.history.pushState({}, "", "/dashboard/orders");
    render(
      <AppShell title="Test" modules={modules}>
        <SidebarLayout
          sidebar={
            <SidebarLayout.DefaultSidebar>
              <SidebarGroup title="Main">
                <SidebarItem to="/dashboard" activeMatch="exact" />
                <SidebarItem to="/dashboard/orders" />
              </SidebarGroup>
            </SidebarLayout.DefaultSidebar>
          }
        />
      </AppShell>,
    );

    expect(await screen.findByText("Orders Page")).toBeDefined();
    await waitFor(() => {
      expect(window.location.search).toBe("?p=5");
    });

    const sidebar = document.querySelector('[data-slot="sidebar"]');
    assert(sidebar);
    const dashboardLink = Array.from(sidebar.querySelectorAll("a")).find(
      (link) => link.textContent === "Dashboard",
    );
    assert(dashboardLink, "Expected Dashboard link in the sidebar");

    fireEvent.click(dashboardLink);

    expect(await screen.findByText("Dashboard Root")).toBeDefined();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/dashboard");
    });
  });
});

describe("DefaultSidebar auto-generation", () => {
  it("applies active style to the current page sidebar item", async () => {
    const modules = [
      defineModule({
        path: "dashboard",
        meta: { title: "Dashboard", icon: <Home /> },
        component: () => <div>Dashboard Root</div>,
        resources: [
          defineResource({
            path: "overview",
            meta: { title: "Overview" },
            component: () => <div>Overview</div>,
          }),
        ],
      }),
    ];

    // pathname is "/dashboard/overview" (with leading slash)
    // but nav item URLs are "dashboard/overview" (without leading slash)
    window.history.pushState({}, "", "/dashboard/overview");
    render(
      <AppShell title="Test" modules={modules}>
        <SidebarLayout />
      </AppShell>,
    );

    // waitFor retries until the callback stops throwing, so the assert
    // must stay inside to wait for the deferred nav items to render.
    const overviewLink = await waitFor(() => {
      const sidebar = document.querySelector('[data-slot="sidebar"]')!;
      const links = sidebar.querySelectorAll("a");
      const link = Array.from(links).find((el) => el.textContent === "Overview");
      assert(link, "Expected 'Overview' link to be rendered in the sidebar");
      return link;
    });

    expect(overviewLink.className).toContain("astw:bg-sidebar-accent");
  });

  it("excludes componentless resources from sidebar links", async () => {
    const modules = [
      defineModule({
        path: "app",
        meta: { title: "App" },
        component: () => <div>App Root</div>,
        resources: [
          defineResource({
            path: "dashboard",
            component: () => <div>Dashboard</div>,
          }),
          defineResource({
            path: "settings",
            // no component, but has sub-resources
            subResources: [
              defineResource({
                path: "general",
                component: () => <div>General</div>,
              }),
            ],
          }),
          defineResource({
            path: "orphan",
            // no component, no sub-resources → excluded entirely
          }),
        ],
      }),
    ];

    window.history.pushState({}, "", "/app/dashboard");
    render(
      <AppShell title="Test" modules={modules}>
        <SidebarLayout />
      </AppShell>,
    );

    // Wait for the auto-generated sidebar *link* to render. We can't key off
    // page text ("Dashboard" is also the route component's content) — the
    // sidebar nav items come from the async root loader and land after the
    // page, so assert on the sidebar anchors directly.
    await waitFor(() => {
      const sidebar = document.querySelector('[data-slot="sidebar"]');
      assert(sidebar);
      const texts = Array.from(sidebar.querySelectorAll("a")).map((link) => link.textContent);
      expect(texts).toContain("Dashboard");
    });

    // Collect all links from the sidebar
    const sidebar = document.querySelector('[data-slot="sidebar"]')!;
    const links = sidebar.querySelectorAll("a");
    const linkTexts = Array.from(links).map((link) => link.textContent);

    // Dashboard should be a navigable link in the sidebar
    expect(linkTexts).toContain("Dashboard");

    // "Orphan" (componentless, no sub-resources) should not appear at all
    expect(sidebar.textContent).not.toContain("Orphan");

    // "Settings" (componentless, has sub-resources) is filtered out from sub-item links
    // because the sidebar filters subItems by url, and componentless resources have url: undefined.
    // Its children ("General") are not rendered either since the sidebar doesn't recurse.
    expect(linkTexts).not.toContain("Settings");
    expect(linkTexts).not.toContain("General");
  });

  it("renders a leaf module (no child resources) as a top-level link without an expand button", async () => {
    const modules = [
      defineModule({
        path: "dashboard",
        meta: { title: "Dashboard", icon: <Home /> },
        component: () => <div>Dashboard</div>,
        resources: [],
      }),
    ];

    window.history.pushState({}, "", "/dashboard");
    render(
      <AppShell title="Test" modules={modules}>
        <SidebarLayout />
      </AppShell>,
    );

    await waitFor(() => {
      const sidebar = document.querySelector('[data-slot="sidebar"]');
      assert(sidebar);
      const texts = Array.from(sidebar.querySelectorAll("a")).map((link) => link.textContent);
      expect(texts).toContain("Dashboard");
    });

    const sidebar = document.querySelector('[data-slot="sidebar"]')!;
    const links = sidebar.querySelectorAll("a");
    const dashboardLink = Array.from(links).find((link) => link.textContent === "Dashboard");

    // The leaf module should appear as a navigable link
    expect(dashboardLink).toBeDefined();
    expect(dashboardLink!.getAttribute("href")).toBe("/dashboard");

    // No expand/collapse trigger should be rendered (no children)
    const triggers = sidebar.querySelectorAll('[data-slot="sidebar-menu-action"]');
    expect(triggers.length).toBe(0);
  });

  it("includes root module (path='') in auto-generated sidebar", async () => {
    const modules = [
      defineModule({
        path: "",
        meta: { title: "Home" },
        component: () => <div>Home</div>,
        resources: [],
      }),
      defineModule({
        path: "dashboard",
        meta: { title: "Dashboard", icon: <Home /> },
        component: () => <div>Dashboard</div>,
        resources: [],
      }),
    ];

    window.history.pushState({}, "", "/dashboard");
    render(
      <AppShell title="Test" modules={modules}>
        <SidebarLayout />
      </AppShell>,
    );

    await waitFor(() => {
      const sidebar = document.querySelector('[data-slot="sidebar"]');
      assert(sidebar);
      const texts = Array.from(sidebar.querySelectorAll("a")).map((link) => link.textContent);
      expect(texts).toContain("Home");
    });

    const sidebar = document.querySelector('[data-slot="sidebar"]')!;
    const links = sidebar.querySelectorAll("a");
    const linkTexts = Array.from(links).map((link) => link.textContent);

    expect(linkTexts).toContain("Home");
    expect(linkTexts).toContain("Dashboard");
  });

  it("shows synthetic root module in sidebar when rootComponent is provided without root module", async () => {
    const modules = [
      defineModule({
        path: "dashboard",
        meta: { title: "Dashboard", icon: <Home /> },
        component: () => <div>Dashboard</div>,
        resources: [],
      }),
    ];

    window.history.pushState({}, "", "/dashboard");
    render(
      <AppShell title="Test" modules={modules} rootComponent={() => <div>Root Home</div>}>
        <SidebarLayout />
      </AppShell>,
    );

    await waitFor(() => {
      const sidebar = document.querySelector('[data-slot="sidebar"]');
      assert(sidebar);
      const texts = Array.from(sidebar.querySelectorAll("a")).map((link) => link.textContent);
      expect(texts).toContain("Home");
    });

    const sidebar = document.querySelector('[data-slot="sidebar"]')!;
    const links = sidebar.querySelectorAll("a");
    const linkTexts = Array.from(links).map((link) => link.textContent);

    // Synthetic root module should appear with i18n "Home" title
    expect(linkTexts).toContain("Home");
    expect(linkTexts).toContain("Dashboard");

    // Synthetic root module should have a house icon
    const homeLink = Array.from(links).find((link) => link.textContent === "Home")!;
    expect(homeLink.querySelector("svg.lucide-house")).toBeDefined();
  });

  it("does not inject synthetic root module when root module already exists", async () => {
    const modules = [
      defineModule({
        path: "",
        meta: { title: "My Dashboard" },
        component: () => <div>My Dashboard</div>,
        resources: [],
      }),
      defineModule({
        path: "products",
        meta: { title: "Products", icon: <Package /> },
        component: () => <div>Products</div>,
        resources: [],
      }),
    ];

    window.history.pushState({}, "", "/products");
    render(
      <AppShell title="Test" modules={modules} rootComponent={() => <div>Ignored Root</div>}>
        <SidebarLayout />
      </AppShell>,
    );

    await waitFor(() => {
      const sidebar = document.querySelector('[data-slot="sidebar"]');
      assert(sidebar);
      const texts = Array.from(sidebar.querySelectorAll("a")).map((link) => link.textContent);
      expect(texts).toContain("My Dashboard");
    });

    const sidebar = document.querySelector('[data-slot="sidebar"]')!;
    const links = sidebar.querySelectorAll("a");
    const linkTexts = Array.from(links).map((link) => link.textContent);

    // Explicit root module title should be used, not "Home"
    expect(linkTexts).toContain("My Dashboard");
    expect(linkTexts).not.toContain("Home");
  });
});
