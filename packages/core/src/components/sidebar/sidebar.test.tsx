import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi } from "vitest";
import { MemoryRouter } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
} from "@/components/sidebar";
import { AppShellConfigContext, type RootConfiguration } from "@/contexts/appshell-context";
import { SidebarItem } from "./sidebar-item";
import { SidebarGroup } from "./sidebar-group";
import { SidebarSeparator } from "./sidebar-separator";
import { defineModule, defineResource } from "@/resource";
import { Home, Package } from "lucide-react";
import { DefaultErrorBoundary } from "@/components/default-error-boundary";
import { Link } from "react-router";

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
 * Wrapper to render sidebar components with all required providers.
 */
const renderWithProviders = (ui: React.ReactNode, initialPath = "/dashboard/overview") => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
        <SidebarProvider>
          <SidebarMenu data-testid="sidebar-menu">{ui}</SidebarMenu>
        </SidebarProvider>
      </AppShellConfigContext.Provider>
    </MemoryRouter>,
  );
};

/**
 * Get the sidebar menu container for scoped queries.
 */
const getSidebarMenu = () => {
  return within(screen.getByTestId("sidebar-menu"));
};

describe("SidebarItem", () => {
  it("renders with auto-resolved title from resource meta", () => {
    renderWithProviders(<SidebarItem to="/dashboard" />);

    const menu = getSidebarMenu();
    expect(menu.getByRole("link", { name: /dashboard/i })).toBeDefined();
  });

  it("renders with custom render function", () => {
    renderWithProviders(
      <SidebarItem
        to="/dashboard"
        render={({ title }) => <span data-testid="custom">{title} Custom</span>}
      />,
    );

    const menu = getSidebarMenu();
    expect(menu.getByTestId("custom").textContent).toContain("Dashboard Custom");
  });

  it("renders external link with target blank", () => {
    renderWithProviders(<SidebarItem to="https://docs.example.com" external />);

    const menu = getSidebarMenu();
    const link = menu.getByRole("link");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("auto-detects external URLs without external prop", () => {
    renderWithProviders(<SidebarItem to="https://google.com" />);

    const menu = getSidebarMenu();
    const link = menu.getByRole("link");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("shows active state when path matches", () => {
    renderWithProviders(<SidebarItem to="/dashboard/overview" />, "/dashboard/overview");

    const menu = getSidebarMenu();
    const link = menu.getByRole("link");
    expect(link.className).toContain("astw:bg-sidebar-accent");
  });

  it("falls back to URL-based title for unknown paths", () => {
    renderWithProviders(<SidebarItem to="/unknown/some-path" />);

    const menu = getSidebarMenu();
    expect(menu.getByRole("link", { name: /some path/i })).toBeDefined();
  });
});

const localizedTitle = (locale: string) => (locale === "ja" ? "製品" : "Localized Products");

describe("SidebarGroup", () => {
  it("renders group with title and children", () => {
    renderWithProviders(
      <SidebarGroup title="My Group">
        <SidebarItem to="/dashboard" />
      </SidebarGroup>,
    );

    const menu = getSidebarMenu();
    expect(menu.getByText("My Group")).toBeDefined();
    expect(menu.getByRole("link", { name: /dashboard/i })).toBeDefined();
  });

  it("renders group with icon", () => {
    renderWithProviders(
      <SidebarGroup title="Products" icon={<Package data-testid="group-icon" />}>
        <SidebarItem to="/products/all" />
      </SidebarGroup>,
    );

    const menu = getSidebarMenu();
    expect(menu.getByTestId("group-icon")).toBeDefined();
  });

  it("renders clickable group header when to prop is provided", () => {
    renderWithProviders(
      <SidebarGroup title="Products" to="/products">
        <SidebarItem to="/products/all" />
      </SidebarGroup>,
    );

    const menu = getSidebarMenu();
    // Check that the group header is a link with the correct href
    const links = menu.getAllByRole("link");
    const headerLink = links.find((l) => l.getAttribute("href") === "/products");
    expect(headerLink).toBeDefined();
  });

  it("supports localized title function", () => {
    renderWithProviders(
      <SidebarGroup title={localizedTitle}>
        <SidebarItem to="/products/all" />
      </SidebarGroup>,
    );

    const menu = getSidebarMenu();
    expect(menu.getByText("Localized Products")).toBeDefined();
  });

  it("renders nested groups", () => {
    renderWithProviders(
      <SidebarGroup title="Parent Group">
        <SidebarGroup title="Child Group">
          <SidebarItem to="/dashboard" />
        </SidebarGroup>
      </SidebarGroup>,
    );

    const menu = getSidebarMenu();
    expect(menu.getByText("Parent Group")).toBeDefined();
    expect(menu.getByText("Child Group")).toBeDefined();
    expect(menu.getByRole("link", { name: /dashboard/i })).toBeDefined();
  });

  it("collapses and expands on toggle click", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SidebarGroup title="Collapsible Group">
        <SidebarItem to="/dashboard" />
      </SidebarGroup>,
    );

    const menu = getSidebarMenu();
    // Initially expanded (defaultOpen=true)
    expect(menu.getByRole("link", { name: /dashboard/i })).toBeDefined();

    // Click to collapse
    const toggleButton = menu.getByRole("button", { name: /toggle/i });
    await user.click(toggleButton);

    // Content should be hidden after collapse
    expect(menu.queryByRole("link", { name: /dashboard/i })).toBeNull();

    // Click to expand again
    await user.click(toggleButton);

    // Content should be visible again
    expect(menu.getByRole("link", { name: /dashboard/i })).toBeDefined();
  });

  it("respects defaultOpen=false", () => {
    renderWithProviders(
      <SidebarGroup title="Collapsed Group" defaultOpen={false}>
        <SidebarItem to="/dashboard" />
      </SidebarGroup>,
    );

    const menu = getSidebarMenu();
    // Group title should be visible
    expect(menu.getByText("Collapsed Group")).toBeDefined();
    // But children should be hidden
    expect(menu.queryByRole("link", { name: /dashboard/i })).toBeNull();
  });
});

describe("SidebarSeparator", () => {
  it("renders separator element", () => {
    renderWithProviders(
      <>
        <SidebarItem to="/dashboard" />
        <SidebarSeparator />
        <SidebarItem to="/products" />
      </>,
    );

    const menu = screen.getByTestId("sidebar-menu");
    const separator = menu.querySelector('[data-sidebar="separator"]');
    expect(separator).toBeDefined();
    expect(separator).not.toBeNull();
  });
});

describe("Mobile sidebar", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderMobileSidebar = (initialPath = "/") => {
    // Mock useIsMobile to return true
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Mock innerWidth to mobile size
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
          <SidebarProvider>
            <SidebarTrigger data-testid="mobile-trigger" />
            <Sidebar>
              <SidebarContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<Link to="/dashboard" />} data-testid="menu-button">
                      Dashboard
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          render={<Link to="/dashboard/overview" />}
                          data-testid="sub-menu-button"
                        >
                          Overview
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarContent>
            </Sidebar>
          </SidebarProvider>
        </AppShellConfigContext.Provider>
      </MemoryRouter>,
    );
  };

  it("opens when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderMobileSidebar();

    // Open the mobile sidebar
    await user.click(screen.getByTestId("mobile-trigger"));

    // The sidebar content should be visible (rendered inside Sheet)
    const menuButton = await screen.findByTestId("menu-button");
    expect(menuButton).toBeDefined();
  });

  it("closes when a menu item is clicked", async () => {
    const user = userEvent.setup();
    renderMobileSidebar();

    // Open the mobile sidebar
    await user.click(screen.getByTestId("mobile-trigger"));

    // The sidebar content should be visible (rendered inside Sheet)
    const menuButton = await screen.findByTestId("menu-button");
    expect(menuButton).toBeDefined();

    // Click the menu button
    await user.click(menuButton);

    // The sidebar should close
    await vi.waitFor(() => {
      expect(screen.queryByTestId("menu-button")).toBeNull();
    });
  });

  it("closes when a sub menu item is clicked", async () => {
    const user = userEvent.setup();
    renderMobileSidebar();

    // Open the mobile sidebar
    await user.click(screen.getByTestId("mobile-trigger"));

    // The sidebar content should be visible
    const subMenuButton = await screen.findByTestId("sub-menu-button");
    expect(subMenuButton).toBeDefined();

    // Click the sub menu button
    await user.click(subMenuButton);

    // The sidebar should close
    await vi.waitFor(() => {
      expect(screen.queryByTestId("sub-menu-button")).toBeNull();
    });
  });
});
