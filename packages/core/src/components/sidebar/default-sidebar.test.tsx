import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { MemoryRouter } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  AppShellConfigContext,
  type RootConfiguration,
} from "@/contexts/appshell-context";
import { DefaultSidebar } from "./default-sidebar";
import { SidebarItem } from "./sidebar-item";
import { SidebarGroup } from "./sidebar-group";
import { SidebarSeparator } from "./sidebar-separator";
import { defineModule, defineResource } from "@/resource";
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
const renderDefaultSidebar = (
  children: React.ReactNode,
  initialPath = "/dashboard/overview",
) => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
        <SidebarProvider>
          <DefaultSidebar>{children}</DefaultSidebar>
        </SidebarProvider>
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
