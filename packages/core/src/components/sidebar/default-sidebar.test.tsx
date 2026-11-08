import { render, screen, cleanup, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, assert, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { SidebarProvider, SidebarTrigger } from "./primitives";
import { AppShellConfigContext, type RootConfiguration } from "@/contexts/appshell-context";
import { CommandPaletteProvider } from "@/contexts/command-palette-context";
import { DefaultSidebar } from "./default-sidebar";
import { SidebarLayout } from "./sidebar-layout";
import { SidebarItem } from "./sidebar-item";
import { SidebarGroup } from "./sidebar-group";
import { SidebarSection } from "./sidebar-section";
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

/**
 * Force a true desktop width (>= 1200px) so `isIconMode` (tablet) is false —
 * the default test width lands in the tablet range, which forces the icon rail.
 */
const stubDesktopViewport = () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
  window.dispatchEvent(new Event("resize"));
};

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
  stubDesktopViewport();
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
    expect(searchButton.className).toContain("astw:text-body-sm");
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
    // Asserts on the link's text label, so the sidebar must be expanded rather
    // than an icon rail.
    stubDesktopViewport();
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

/** The open icon-rail flyout for the group called `title`, or null. */
const openFlyout = (title: string) =>
  document.querySelector(`nav[aria-label="${title}"]`) as HTMLElement | null;

describe("DefaultSidebar opt-in props", () => {
  const renderWithProps = (
    props: React.ComponentProps<typeof DefaultSidebar>,
    { defaultOpen = true }: { defaultOpen?: boolean } = {},
  ) => {
    stubDesktopViewport();
    return render(
      <MemoryRouter initialEntries={["/dashboard/overview"]}>
        <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
          <CommandPaletteProvider>
            <SidebarProvider defaultOpen={defaultOpen}>
              <DefaultSidebar {...props} />
            </SidebarProvider>
          </CommandPaletteProvider>
        </AppShellConfigContext.Provider>
      </MemoryRouter>,
    );
  };

  it("renders the built-in Search entry by default", () => {
    renderWithProps({ children: <SidebarItem to="/dashboard" /> });
    expect(screen.getByRole("button", { name: /search/i })).toBeDefined();
  });

  it("omits the Search entry when hideSearch is set", () => {
    renderWithProps({ hideSearch: true, children: <SidebarItem to="/dashboard" /> });
    expect(screen.queryByRole("button", { name: /search/i })).toBeNull();
    // Children still render.
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeDefined();
  });

  it("renders the sidebar header by default", () => {
    renderWithProps({ children: <SidebarItem to="/dashboard" /> });
    expect(document.querySelector('[data-slot="sidebar-header"]')).not.toBeNull();
  });

  it("omits the sidebar header when hideHeader is set", () => {
    renderWithProps({ hideHeader: true, children: <SidebarItem to="/dashboard" /> });
    expect(document.querySelector('[data-slot="sidebar-header"]')).toBeNull();
  });

  it("collapses off-canvas by default", () => {
    renderWithProps({ children: <SidebarItem to="/dashboard" /> }, { defaultOpen: false });
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    expect(sidebar?.getAttribute("data-collapsible")).toBe("offcanvas");
  });

  it("collapses to an icon rail when iconRail is set", () => {
    renderWithProps(
      { iconRail: true, children: <SidebarItem to="/dashboard" /> },
      { defaultOpen: false },
    );
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    expect(sidebar?.getAttribute("data-collapsible")).toBe("icon");
  });

  it("keeps the icon rail visible on mobile instead of an off-canvas drawer", () => {
    // Mobile width: without iconRail this would be a closed off-canvas Sheet
    // (no persistent [data-slot=sidebar]); iconRail keeps the rail mounted.
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(500);
    window.dispatchEvent(new Event("resize"));
    render(
      <MemoryRouter initialEntries={["/dashboard/overview"]}>
        <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
          <CommandPaletteProvider>
            <SidebarProvider>
              <DefaultSidebar iconRail>
                <SidebarItem to="/dashboard" />
              </DefaultSidebar>
            </SidebarProvider>
          </CommandPaletteProvider>
        </AppShellConfigContext.Provider>
      </MemoryRouter>,
    );
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    expect(sidebar).not.toBeNull();
    // Forced to icon width on mobile (no inline expand there).
    expect(sidebar?.getAttribute("data-collapsible")).toBe("icon");
  });

  it("opens the full sidebar as a slide-in overlay when the mobile toggle is tapped", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(500);
    window.dispatchEvent(new Event("resize"));
    render(
      <MemoryRouter initialEntries={["/dashboard/overview"]}>
        <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
          <CommandPaletteProvider>
            <SidebarProvider>
              <DefaultSidebar iconRail hideHeader footer={<SidebarTrigger />}>
                <SidebarItem to="/dashboard" />
              </DefaultSidebar>
            </SidebarProvider>
          </CommandPaletteProvider>
        </AppShellConfigContext.Provider>
      </MemoryRouter>,
    );

    // The rail is visible but the slide-in overlay is not mounted yet.
    expect(document.querySelector('[data-slot="sidebar-overlay"]')).toBeNull();

    await user.click(screen.getByRole("button", { name: /toggle sidebar/i }));

    // The toggle opens the overlay drawer.
    expect(document.querySelector('[data-slot="sidebar-overlay"]')).not.toBeNull();
  });

  it("keeps section items as plain rail icons and collapses the heading", () => {
    renderWithProps(
      {
        iconRail: true,
        hideHeader: true,
        children: (
          <SidebarSection title="Services">
            <SidebarItem to="/dashboard" />
            <SidebarItem to="/products" />
          </SidebarSection>
        ),
      },
      { defaultOpen: false },
    );

    // Unlike a group, a section has no flyout trigger: its items stay in the rail.
    expect(screen.queryByRole("button", { name: "Services" })).toBeNull();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /products/i })).toBeDefined();
    // The heading collapses away at icon width.
    const heading = document.querySelector('[data-slot="sidebar-section-title"]');
    expect(heading?.className).toContain("astw:group-data-[collapsible=icon]:opacity-0");
  });

  it("falls back to the title's initial for icon-less items and groups in the rail", () => {
    renderWithProps(
      {
        iconRail: true,
        hideHeader: true,
        children: (
          <>
            <SidebarItem to="/features" title="features" />
            <SidebarItem to="/invoices-ja" title="請求書" />
            <SidebarGroup title="Billing">
              <SidebarItem to="/invoices" title="Invoices" />
            </SidebarGroup>
            <SidebarItem to="/home" title="Home" icon={<Home data-testid="home-icon" />} />
          </>
        ),
      },
      { defaultOpen: false },
    );

    const fallbacks = document.querySelectorAll('[data-slot="sidebar-icon-fallback"]');
    expect(Array.from(fallbacks, (el) => el.textContent)).toEqual(["F", "請", "B"]);
    expect(fallbacks[0]?.getAttribute("class")).toContain(
      "astw:group-data-[collapsible=icon]:block",
    );
    // Hairline frame: 0.5px at 20% of the text color
    const frame = fallbacks[0]?.querySelector("rect");
    expect(frame?.getAttribute("stroke-width")).toBe("0.5");
    expect(frame?.getAttribute("stroke-opacity")).toBe("0.2");
    expect(screen.getByTestId("home-icon")).toBeDefined();
  });

  it("reveals a group's children in a hover flyout in the icon rail", async () => {
    const user = userEvent.setup();
    renderWithProps(
      {
        iconRail: true,
        hideHeader: true,
        children: (
          <SidebarGroup title="Main" icon={<Home />}>
            <SidebarItem to="/dashboard" />
            <SidebarItem to="/products" />
          </SidebarGroup>
        ),
      },
      { defaultOpen: false },
    );

    // No flyout until the group icon is hovered.
    expect(document.querySelector('nav[aria-label="Main"]')).toBeNull();

    await user.hover(screen.getByRole("button", { name: "Main" }));

    const flyout = document.querySelector('nav[aria-label="Main"]') as HTMLElement;
    expect(flyout).not.toBeNull();
    expect(within(flyout).getByRole("link", { name: /dashboard/i })).toBeDefined();
    expect(within(flyout).getByRole("link", { name: /products/i })).toBeDefined();
  });

  /** Renders a collapsed icon rail on a touch device (no hover) at `width`. */
  const renderTouchRail = (width: number, to?: string) => {
    // A touch screen cannot hover, so the rail's flyout must open on tap.
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) =>
      query === "(hover: hover)"
        ? ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
          } as MediaQueryList)
        : matchMedia(query),
    );
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
    window.dispatchEvent(new Event("resize"));
    render(
      <MemoryRouter initialEntries={["/dashboard/overview"]}>
        <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
          <CommandPaletteProvider>
            <SidebarProvider defaultOpen={false}>
              <DefaultSidebar iconRail hideHeader>
                <SidebarGroup title="Main" icon={<Home />} to={to}>
                  <SidebarItem to="/dashboard" />
                  <SidebarItem to="/products" />
                </SidebarGroup>
                <SidebarGroup title="Other" icon={<Home />}>
                  <SidebarItem to="/settings" />
                </SidebarGroup>
              </DefaultSidebar>
            </SidebarProvider>
          </CommandPaletteProvider>
        </AppShellConfigContext.Provider>
      </MemoryRouter>,
    );
  };

  it.each([
    { name: "a group", width: 375, to: undefined },
    { name: "a group", width: 768, to: undefined },
    { name: "a group with its own page", width: 1024, to: "/main" },
    { name: "a group", width: 1280, to: undefined },
  ])(
    "opens the flyout when $name is tapped in the rail at $width px on a touch device",
    async ({ width, to }) => {
      const user = userEvent.setup();
      renderTouchRail(width, to);

      // A button rather than a link, so the tap opens the flyout instead of
      // leaving the page.
      const trigger = screen.getByRole("button", { name: "Main" });
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(openFlyout("Main")).toBeNull();

      await user.click(trigger);

      const nav = openFlyout("Main");
      expect(nav).not.toBeNull();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(trigger.getAttribute("aria-controls")).toBe(nav!.id);
      expect(within(nav!).getByRole("link", { name: /dashboard/i })).toBeDefined();
      expect(within(nav!).getByRole("link", { name: /products/i })).toBeDefined();
      // The tap opens the flyout, not the slide-in drawer, and the sidebar stays a rail.
      expect(document.querySelector('[data-slot="sidebar-overlay"]')).toBeNull();
      expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state")).toBe(
        "collapsed",
      );

      // A second tap closes it.
      await user.click(trigger);
      expect(openFlyout("Main")).toBeNull();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    },
  );

  it("links the flyout heading to the group's own page", async () => {
    const user = userEvent.setup();
    renderTouchRail(768, "/main");

    await user.click(screen.getByRole("button", { name: "Main" }));

    const heading = within(openFlyout("Main")!).getByRole("link", { name: "Main" });
    expect(heading.getAttribute("href")).toBe("/main");
  });

  it("closes the touch flyout on a tap outside, and opens only one group at a time", async () => {
    const user = userEvent.setup();
    renderTouchRail(768);

    await user.click(screen.getByRole("button", { name: "Main" }));
    expect(openFlyout("Main")).not.toBeNull();

    // Tapping another group closes this flyout and opens that one.
    await user.click(screen.getByRole("button", { name: "Other" }));
    expect(openFlyout("Main")).toBeNull();
    expect(openFlyout("Other")).not.toBeNull();

    // A tap outside every group closes the open flyout.
    await user.click(document.body);
    expect(openFlyout("Other")).toBeNull();
  });

  it("closes the touch flyout on Escape and returns focus to the group icon", async () => {
    const user = userEvent.setup();
    renderTouchRail(768);

    const trigger = screen.getByRole("button", { name: "Main" });
    await user.click(trigger);
    expect(openFlyout("Main")).not.toBeNull();

    await user.keyboard("{Escape}");
    expect(openFlyout("Main")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes the touch flyout when a page in it is opened", async () => {
    const user = userEvent.setup();
    renderTouchRail(768);

    await user.click(screen.getByRole("button", { name: "Main" }));
    await user.click(within(openFlyout("Main")!).getByRole("link", { name: /products/i }));

    expect(openFlyout("Main")).toBeNull();
  });

  it("marks the hover trigger expanded, links the heading, and closes on Escape on a hover device", async () => {
    const user = userEvent.setup();
    renderWithProps(
      {
        iconRail: true,
        hideHeader: true,
        children: (
          <SidebarGroup title="Main" icon={<Home />} to="/main">
            <SidebarItem to="/dashboard" />
          </SidebarGroup>
        ),
      },
      { defaultOpen: false },
    );

    // With a mouse, a group with its own page keeps its link as the trigger.
    const trigger = screen.getByRole("link", { name: "Main" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await user.hover(trigger);
    const nav = openFlyout("Main")!;
    expect(nav).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(nav.id);
    expect(within(nav).getByRole("link", { name: "Main" }).getAttribute("href")).toBe("/main");

    await user.keyboard("{Escape}");
    expect(openFlyout("Main")).toBeNull();
  });

  it("reveals the group flyout on the mobile-width icon rail when hover-capable", async () => {
    const user = userEvent.setup();
    // A narrow (mobile-width) window but a hover-capable pointer — e.g. a
    // desktop browser shrunk below the mobile breakpoint. The rail is icon-only,
    // so the flyout should still open on hover.
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(500);
    window.dispatchEvent(new Event("resize"));
    render(
      <MemoryRouter initialEntries={["/dashboard/overview"]}>
        <AppShellConfigContext.Provider value={{ configurations: testConfig }}>
          <CommandPaletteProvider>
            <SidebarProvider>
              <DefaultSidebar iconRail hideHeader>
                <SidebarGroup title="Main" icon={<Home />}>
                  <SidebarItem to="/dashboard" />
                  <SidebarItem to="/products" />
                </SidebarGroup>
              </DefaultSidebar>
            </SidebarProvider>
          </CommandPaletteProvider>
        </AppShellConfigContext.Provider>
      </MemoryRouter>,
    );

    expect(document.querySelector('nav[aria-label="Main"]')).toBeNull();
    await user.hover(screen.getByRole("button", { name: "Main" }));
    expect(document.querySelector('nav[aria-label="Main"]')).not.toBeNull();
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

    // Active styling (background, weight and --sidebar-accent-foreground text)
    // is keyed on data-active, so the item must carry it — not just a class.
    expect(overviewLink.getAttribute("data-active")).toBe("true");
    expect(overviewLink.getAttribute("aria-current")).toBe("page");
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
