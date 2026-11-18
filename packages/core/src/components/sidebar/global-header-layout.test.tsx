import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, expectTypeOf, afterEach, vi } from "vitest";
import { GlobalHeaderLayout } from "./global-header-layout";
import { GlobalHeader } from "./global-header";
import { ContentContainer } from "./content-container";
import { DynamicBreadcrumb } from "@/components/sidebar/dynamic-breadcrumb";
import { useAppShellSidebar } from "./use-app-shell-sidebar";
import { AppShell } from "@/components/appshell";
import { defineModule } from "@/resource";
import { Home } from "lucide-react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

// The env default width lands in the tablet range; force desktop so the sidebar
// state (expanded/collapsed) is what drives the icon rail.
const stubDesktopViewport = () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
  window.dispatchEvent(new Event("resize"));
};

const createModules = () => [
  defineModule({
    path: "dashboard",
    meta: { title: "Dashboard", icon: <Home /> },
    component: () => <div>Dashboard</div>,
    resources: [],
  }),
];

const renderLayout = (props: Parameters<typeof GlobalHeaderLayout>[0] = {}) => {
  window.history.pushState({}, "", "/dashboard");
  return render(
    <AppShell title="My App" modules={createModules()}>
      <GlobalHeaderLayout {...props} />
    </AppShell>,
  );
};

function SidebarStateProbe() {
  const { sidebarBehaviour, open } = useAppShellSidebar();
  return <output data-testid="sidebar-state">{`${sidebarBehaviour}:${open}`}</output>;
}

describe("GlobalHeaderLayout", () => {
  it("renders a global top bar with the app title and the route breadcrumb", async () => {
    stubDesktopViewport();
    renderLayout();

    await waitFor(() => {
      const header = document.querySelector("header");
      expect(header).not.toBeNull();
      expect(header!.textContent).toContain("My App");
      expect(header!.textContent).toContain("Dashboard");
    });
  });

  it("bakes hideHeader + iconRail into the default sidebar", async () => {
    stubDesktopViewport();
    renderLayout({ defaultOpen: false });

    await waitFor(() => {
      expect(document.querySelector('[data-slot="sidebar"]')).not.toBeNull();
    });

    // hideHeader → no sidebar header row; iconRail → collapses to the icon rail.
    expect(document.querySelector('[data-slot="sidebar-header"]')).toBeNull();
    const sidebar = document.querySelector('[data-slot="sidebar"]')!;
    expect(sidebar.getAttribute("data-collapsible")).toBe("icon");
  });

  it("provides a desktop resize handle when collapsing is enabled", async () => {
    stubDesktopViewport();
    renderLayout();
    const handle = await screen.findByRole("separator", { name: "Resize sidebar" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });

    const wrapper = document.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement;
    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("272px");
    expect(handle.getAttribute("aria-valuenow")).toBe("272");
  });

  it("does not expose a separate resizable prop or permit simultaneous legacy and new props", () => {
    expectTypeOf<Parameters<typeof GlobalHeaderLayout>[0]>().not.toHaveProperty("resizable");
    expectTypeOf<{ sidebarBehaviour: "resize"; collapsible: false }>().not.toExtend<
      Parameters<typeof GlobalHeaderLayout>[0]
    >();
  });

  it.each([
    { props: {}, expected: "collapse-and-resize" },
    { props: { collapsible: true }, expected: "collapse" },
    { props: { collapsible: false }, expected: "fixed" },
    { props: { sidebarBehaviour: "fixed" }, expected: "fixed" },
    { props: { sidebarBehaviour: "collapse" }, expected: "collapse" },
    { props: { sidebarBehaviour: "resize" }, expected: "resize" },
    { props: { sidebarBehaviour: "collapse-and-resize" }, expected: "collapse-and-resize" },
  ] as const)(
    "forwards normalized $expected configuration from $props",
    async ({ props, expected }) => {
      stubDesktopViewport();
      renderLayout({ ...props, header: <SidebarStateProbe /> });
      expect((await screen.findByTestId("sidebar-state")).textContent).toBe(`${expected}:true`);
      expect(screen.queryByRole("separator", { name: "Resize sidebar" }) !== null).toBe(
        expected === "resize" || expected === "collapse-and-resize",
      );
    },
  );

  it.each([
    ["fixed", false, false],
    ["collapse", true, false],
    ["resize", false, true],
    ["collapse-and-resize", true, true],
  ] as const)(
    "renders only the permitted desktop controls (%s)",
    async (sidebarBehaviour, canCollapse, canResize) => {
      stubDesktopViewport();
      renderLayout({ sidebarBehaviour });
      await waitFor(() => expect(document.querySelector('[data-slot="sidebar"]')).not.toBeNull());
      expect(screen.queryAllByRole("button", { name: "Toggle Sidebar" }).length > 0).toBe(
        canCollapse,
      );
      expect(screen.queryByRole("separator", { name: "Resize sidebar" }) !== null).toBe(canResize);
      if (canCollapse) {
        fireEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
        expect(
          document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-collapsible"),
        ).toBe("icon");
        expect(screen.queryByRole("button", { name: "Expand sidebar" }) !== null).toBe(canResize);
      }
    },
  );

  describe.each([375, 1024])("responsive menu at %ipx", (width) => {
    it.each(["fixed", "collapse", "resize", "collapse-and-resize"] as const)(
      "keeps the stock full menu accessible in %s mode",
      async (sidebarBehaviour) => {
        vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
        renderLayout({ sidebarBehaviour });
        fireEvent.click(await screen.findByRole("button", { name: "Toggle Sidebar" }));
        const dialog = await screen.findByRole("dialog", { name: "Sidebar" });
        expect(await within(dialog).findByRole("link", { name: "Dashboard" })).toBeDefined();
        expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
      },
    );

    it("uses a responsive menu for legacy collapsible=false", async () => {
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
      renderLayout({ collapsible: false });
      fireEvent.click(await screen.findByRole("button", { name: "Toggle Sidebar" }));
      const dialog = await screen.findByRole("dialog", { name: "Sidebar" });
      expect(await within(dialog).findByRole("link", { name: "Dashboard" })).toBeDefined();
      expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
    });
  });

  it("hides resize and collapse controls when collapsing is disabled", async () => {
    stubDesktopViewport();
    renderLayout({ collapsible: false, defaultOpen: false });
    await waitFor(() => expect(document.querySelector('[data-slot="sidebar"]')).not.toBeNull());
    expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Expand sidebar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Toggle Sidebar" })).toBeNull();
    expect(
      document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-collapsible"),
    ).toBeNull();
  });

  it("collapses to the icon rail with Home and expands from its handle at the default width", async () => {
    stubDesktopViewport();
    renderLayout();
    fireEvent.keyDown(await screen.findByRole("separator", { name: "Resize sidebar" }), {
      key: "Home",
    });
    expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-collapsible")).toBe(
      "icon",
    );
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(
      screen.getByRole("separator", { name: "Resize sidebar" }).getAttribute("aria-valuenow"),
    ).toBe("256");
  });

  it("measures the icon rail for resistant opening and closing without replacing the handle", async () => {
    stubDesktopViewport();
    renderLayout({ defaultOpen: false });
    const handle = await screen.findByRole("button", { name: "Expand sidebar" });
    Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
    const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement;
    const measure = sidebar.querySelector('[data-slot="sidebar-collapsed-size"]')!;
    const measurement = vi
      .spyOn(measure, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(0, 0, 64, 0));
    expect(sidebar.style.getPropertyValue("--sidebar-collapsed-width")).toBe(
      "calc(var(--sidebar-width-icon) + var(--astw-spacing) * 4)",
    );
    const gap = sidebar.querySelector('[data-slot="sidebar-gap"]') as HTMLElement;
    const pane = sidebar.querySelector('[data-slot="sidebar-container"]') as HTMLElement;
    const pointer = { pointerId: 1, isPrimary: true, button: 0 };
    fireEvent.pointerDown(handle, { ...pointer, clientX: 64 });
    expect(measurement).toHaveBeenCalledOnce();
    fireEvent.pointerMove(handle, { ...pointer, clientX: 128 });
    expect(sidebar.style.getPropertyValue("--sidebar-drag-width")).toBe("80px");
    expect(sidebar.style.getPropertyValue("--sidebar-drag-pane-width")).toBe(
      "var(--sidebar-drag-width)",
    );
    expect(gap.style.width).toBe("");
    expect(pane.style.width).toBe("");
    expect(sidebar.getAttribute("data-state")).toBe("collapsed");
    fireEvent.pointerMove(handle, { ...pointer, clientX: 192 });
    expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBe(handle);
    expect(sidebar.style.getPropertyValue("--sidebar-drag-width")).toBe("192px");
    fireEvent.pointerMove(handle, { ...pointer, clientX: 240 });
    expect(sidebar.style.getPropertyValue("--sidebar-drag-width")).toBe("240px");
    expect(handle.getAttribute("aria-valuenow")).toBe("240");
    expect(
      (
        document.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement
      ).style.getPropertyValue("--sidebar-width"),
    ).toBe("192px");
    fireEvent.pointerMove(handle, { ...pointer, clientX: 128 });
    expect(sidebar.style.getPropertyValue("--sidebar-drag-width")).toBe("176px");
    expect(gap.style.width).toBe("");
    expect(pane.style.width).toBe("");
    expect(sidebar.getAttribute("data-state")).toBe("expanded");
    fireEvent.pointerMove(handle, { ...pointer, clientX: 90 });
    expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBe(handle);
    fireEvent.pointerMove(handle, { ...pointer, clientX: 89.6 });
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBe(handle);
    expect(sidebar.style.getPropertyValue("--sidebar-drag-width")).toBe("64px");
    fireEvent.pointerMove(handle, { ...pointer, clientX: 88 });
    expect(sidebar.style.getPropertyValue("--sidebar-drag-width")).toBe("64px");
    fireEvent.pointerUp(handle, pointer);
    expect(sidebar.style.getPropertyValue("--sidebar-drag-width")).toBe("");
    expect(gap.style.width).toBe("");
    expect(pane.style.width).toBe("");
  });

  it("exposes the namespaced building blocks", () => {
    expect(GlobalHeaderLayout.DefaultHeader).toBe(GlobalHeader);
    expect(GlobalHeaderLayout.ContentContainer).toBe(ContentContainer);
    expect(GlobalHeaderLayout.Breadcrumb).toBe(DynamicBreadcrumb);
  });
});
