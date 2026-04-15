import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { SidebarProvider } from "@/components/sidebar";
import { AppShellConfigContext, type RootConfiguration } from "@/contexts/appshell-context";
import { CommandPaletteProvider } from "@/contexts/command-palette-context";
import { DefaultSidebar } from "./default-sidebar";
import { SidebarLayout } from "./sidebar-layout";
import { SidebarItem } from "./sidebar-item";
import { SidebarGroup } from "./sidebar-group";
import { SidebarSeparator } from "./sidebar-separator";
import { defineModule, defineResource } from "@/resource";
import { AppShell } from "@/components/appshell";
import { Home, Package } from "lucide-react";
import { DefaultErrorBoundary } from "@/components/default-error-boundary";

afterEach(() => {
  cleanup();
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

describe("DefaultSidebar", () => {
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

    await waitFor(() => {
      expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
    });

    const sidebar = document.querySelector('[data-slot="sidebar"]')!;
    const links = sidebar.querySelectorAll("a");
    const overviewLink = Array.from(links).find((link) => link.textContent === "Overview");

    expect(overviewLink).toBeDefined();
    expect(overviewLink!.className).toContain("astw:bg-sidebar-accent");
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

    // Wait for auto-generated sidebar items to render
    await waitFor(() => {
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
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
});
