import { Profiler, type ReactNode } from "react";
import { render, cleanup, waitFor, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi } from "vitest";
import { SidebarLayout } from "./sidebar-layout";
import { DefaultHeader } from "./default-header";
import { DefaultSidebar } from "./default-sidebar";
import { Sidebar, SidebarProvider, useSidebar } from "./primitives";
import { AppearanceSwitcher } from "@/components/appearance-switcher";
import { AppShell } from "@/components/appshell";
import { defineModule } from "@/resource";
import { Home } from "lucide-react";

/**
 * The header's right-hand cluster: the last child div of the header's inner
 * flex row (holds the `actions`, defaulting to the appearance switcher).
 */
const getHeaderRightCluster = () => {
  const header = document.querySelector("header");
  const inner = header?.querySelector(":scope > div");
  return inner?.lastElementChild as HTMLElement | null;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

const createMinimalModules = () => [
  defineModule({
    path: "dashboard",
    meta: { title: "Dashboard", icon: <Home /> },
    component: () => <div>Dashboard</div>,
    resources: [],
  }),
];

/** Use a width outside both mobile and tablet ranges for desktop assertions. */
const stubDesktopViewport = () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1200);
  window.dispatchEvent(new Event("resize"));
};

const renderSidebarLayout = (props: Parameters<typeof SidebarLayout>[0] = {}) => {
  window.history.pushState({}, "", "/dashboard");
  return render(
    <AppShell title="Test" modules={createMinimalModules()}>
      <SidebarLayout {...props} />
    </AppShell>,
  );
};

const sidebarWidth = () =>
  (document.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement).style.getPropertyValue(
    "--sidebar-width",
  );

const dragWidth = () =>
  (document.querySelector('[data-slot="sidebar"]') as HTMLElement).style.getPropertyValue(
    "--sidebar-drag-width",
  );

function PrimitiveSidebarLayout({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <SidebarProvider resizable className={className}>
      <Sidebar>{children}</Sidebar>
    </SidebarProvider>
  );
}

describe("SidebarLayout", () => {
  describe("defaultOpen", () => {
    it("renders sidebar in expanded state by default", async () => {
      stubDesktopViewport();
      renderSidebarLayout();

      await waitFor(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]')!;
        expect(sidebar).toBeDefined();
        expect(sidebar.getAttribute("data-state")).toBe("expanded");
      });
    });

    it("renders the tablet icon rail at 1024px", async () => {
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
      renderSidebarLayout();

      await waitFor(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]');
        expect(sidebar?.getAttribute("data-state")).toBe("collapsed");
        expect(sidebar?.getAttribute("data-collapsible")).toBe("icon");
      });
    });

    it("renders sidebar in collapsed state when defaultOpen is false", async () => {
      stubDesktopViewport();
      renderSidebarLayout({ defaultOpen: false });

      await waitFor(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]')!;
        expect(sidebar).toBeDefined();
        expect(sidebar.getAttribute("data-state")).toBe("collapsed");
      });
    });
  });

  describe("collapsible", () => {
    it("renders sidebar with collapsible=none when collapsible is false", async () => {
      renderSidebarLayout({ collapsible: false });

      await waitFor(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]');
        expect(sidebar).not.toBeNull();
        // collapsible="none" renders a plain div without data-collapsible or data-state
        expect(sidebar!.getAttribute("data-collapsible")).toBeNull();
        expect(sidebar!.getAttribute("data-state")).toBeNull();
      });
    });

    it("does not render sidebar trigger when collapsible is false", async () => {
      renderSidebarLayout({ collapsible: false });

      await waitFor(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]')!;
        expect(sidebar).toBeDefined();
      });

      const trigger = document.querySelector('[data-slot="sidebar-trigger"]');
      expect(trigger).toBeNull();
    });

    it("renders sidebar trigger when collapsible is true (default)", async () => {
      stubDesktopViewport();
      renderSidebarLayout();

      await waitFor(() => {
        const triggers = document.querySelectorAll('[data-slot="sidebar-trigger"]');
        expect(triggers.length).toBeGreaterThan(0);
      });
    });
  });

  describe("resizable", () => {
    it("keeps resizing opt-in and preserves the default width", async () => {
      stubDesktopViewport();
      renderSidebarLayout();

      await waitFor(() => expect(document.querySelector('[data-slot="sidebar"]')).not.toBeNull());
      expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
      expect(sidebarWidth()).toBe("16rem");
    });

    it("exposes an accessible handle and clamps keyboard resizing when collapse is disabled", async () => {
      stubDesktopViewport();
      renderSidebarLayout({ resizable: true, collapsible: false });
      const handle = await screen.findByRole("separator", { name: "Resize sidebar" });
      const user = userEvent.setup();
      expect(handle.getAttribute("aria-orientation")).toBe("vertical");
      expect(handle.getAttribute("aria-valuemin")).toBe("192");
      expect(handle.getAttribute("aria-valuemax")).toBe("480");
      expect(handle.getAttribute("aria-valuenow")).toBe("256");
      expect(sidebarWidth()).toBe("256px");

      handle.focus();
      await user.keyboard("{ArrowRight}");
      expect(sidebarWidth()).toBe("272px");
      expect(handle.getAttribute("aria-valuenow")).toBe("272");
      await user.keyboard("{ArrowLeft}");
      expect(sidebarWidth()).toBe("256px");
      await user.keyboard("{Home}{ArrowLeft}");
      expect(sidebarWidth()).toBe("192px");
      await user.keyboard("{End}{ArrowRight}");
      expect(sidebarWidth()).toBe("480px");
    });

    it("keeps an expand handle on collapse and restores the default width on expand", async () => {
      stubDesktopViewport();
      renderSidebarLayout({ resizable: true });
      const handle = await screen.findByRole("separator", { name: "Resize sidebar" });
      fireEvent.keyDown(handle, { key: "ArrowRight" });
      expect(sidebarWidth()).toBe("272px");
      const user = userEvent.setup();
      const trigger = screen.getAllByRole("button", { name: "Toggle Sidebar" })[0]!;

      await user.click(trigger);
      expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
      const expandHandle = screen.getByRole("button", { name: "Expand sidebar" });
      Object.defineProperty(expandHandle, "setPointerCapture", { value: vi.fn() });
      await user.click(expandHandle);
      expect(
        screen.getByRole("separator", { name: "Resize sidebar" }).getAttribute("aria-valuenow"),
      ).toBe("256");
      expect(sidebarWidth()).toBe("256px");
    });

    it("resists below the minimum width and collapses only at the offcanvas boundary", async () => {
      stubDesktopViewport();
      renderSidebarLayout({ resizable: true });
      const handle = await screen.findByRole("separator", { name: "Resize sidebar" });
      Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
      const pointer = { pointerId: 1, isPrimary: true, button: 0 };
      fireEvent.pointerDown(handle, { ...pointer, clientX: 256 });
      fireEvent.pointerMove(handle, { ...pointer, clientX: 192 });
      expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBe(handle);
      expect(handle.getAttribute("aria-valuenow")).toBe("192");
      expect(sidebarWidth()).toBe("256px");
      expect(dragWidth()).toBe("192px");
      fireEvent.pointerMove(handle, { ...pointer, clientX: 96 });
      expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBe(handle);
      expect(dragWidth()).toBe("168px");
      fireEvent.pointerMove(handle, { ...pointer, clientX: 39 });
      expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBe(handle);
      fireEvent.pointerMove(handle, { ...pointer, clientX: 38.4 });
      expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
      expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state")).toBe(
        "collapsed",
      );
      expect(sidebarWidth()).toBe("192px");
      fireEvent.pointerUp(handle, pointer);
      fireEvent.click(handle, { detail: 1 });
      expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state")).toBe(
        "collapsed",
      );

      const expandHandle = screen.getByRole("button", { name: "Expand sidebar" });
      expect(expandHandle).toBe(handle);
      await userEvent.setup().click(expandHandle);
      expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBeDefined();
      expect(sidebarWidth()).toBe("256px");
    });

    it("continues resizing with the same captured handle after dragging open", async () => {
      stubDesktopViewport();
      renderSidebarLayout({ resizable: true, defaultOpen: false });
      const handle = await screen.findByRole("button", { name: "Expand sidebar" });
      Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
      const pointer = { pointerId: 1, isPrimary: true, button: 0 };
      fireEvent.pointerDown(handle, { ...pointer, clientX: 10 });
      fireEvent.pointerMove(handle, { ...pointer, clientX: 14 });
      expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
      const gap = document.querySelector('[data-slot="sidebar-gap"]') as HTMLElement;
      const pane = document.querySelector('[data-slot="sidebar-container"]') as HTMLElement;
      fireEvent.pointerMove(handle, { ...pointer, clientX: 106 });
      expect(screen.getByRole("button", { name: "Expand sidebar" })).toBe(handle);
      expect(dragWidth()).toBe("24px");
      const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement;
      expect(sidebar.style.getPropertyValue("--sidebar-min-width")).toBe("192px");
      expect(sidebar.style.getPropertyValue("--sidebar-drag-pane-width")).toBe(
        "max(var(--sidebar-min-width), var(--sidebar-drag-width))",
      );
      expect(sidebar.style.getPropertyValue("--sidebar-drag-offset")).toBe(
        "calc(var(--sidebar-drag-width) - var(--sidebar-drag-pane-width))",
      );
      expect(gap.style.width).toBe("");
      expect(pane.style.width).toBe("");
      expect(pane.style.left).toBe("");
      fireEvent.pointerMove(handle, { ...pointer, clientX: 202 });
      expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBe(handle);
      expect(handle.getAttribute("data-resizing")).toBe("true");
      expect(sidebarWidth()).toBe("192px");
      expect(dragWidth()).toBe("192px");
      fireEvent.pointerMove(handle, { ...pointer, clientX: 250 });
      expect(dragWidth()).toBe("240px");
      expect(handle.getAttribute("aria-valuenow")).toBe("240");
      expect(sidebarWidth()).toBe("192px");
      fireEvent.pointerMove(handle, { ...pointer, clientX: 1000 });
      expect(dragWidth()).toBe("480px");
      expect(handle.getAttribute("aria-valuenow")).toBe("480");
      expect(sidebarWidth()).toBe("192px");
      fireEvent.pointerMove(handle, { ...pointer, clientX: 106 });
      expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBe(handle);
      expect(dragWidth()).toBe("168px");
      fireEvent.pointerMove(handle, { ...pointer, clientX: 10 });
      expect(screen.getByRole("button", { name: "Expand sidebar" })).toBe(handle);
      fireEvent.pointerMove(handle, { ...pointer, clientX: 106 });
      expect(screen.getByRole("button", { name: "Expand sidebar" })).toBe(handle);
      expect(parseFloat(dragWidth())).toBeCloseTo(14.4);
      fireEvent.pointerMove(handle, { ...pointer, clientX: 250 });
      expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBe(handle);
      expect(sidebarWidth()).toBe("240px");
      fireEvent.pointerUp(handle, pointer);
      expect(handle.getAttribute("data-resizing")).toBe("false");
      expect(dragWidth()).toBe("");
      expect(gap.style.width).toBe("");
      expect(pane.style.width).toBe("");
      fireEvent.pointerMove(handle, { ...pointer, clientX: 150 });
      expect(sidebarWidth()).toBe("240px");
    });

    it.each([
      { defaultOpen: false, startX: 10, endX: 106, visualWidth: "24px", state: "collapsed" },
      { defaultOpen: true, startX: 256, endX: 96, visualWidth: "168px", state: "expanded" },
    ])(
      "settles a partial drag back to the $state boundary on release",
      async ({ defaultOpen, startX, endX, visualWidth, state }) => {
        stubDesktopViewport();
        renderSidebarLayout({ resizable: true, defaultOpen });
        const handle = defaultOpen
          ? await screen.findByRole("separator", { name: "Resize sidebar" })
          : await screen.findByRole("button", { name: "Expand sidebar" });
        Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
        const pointer = { pointerId: 1, isPrimary: true, button: 0 };
        const gap = document.querySelector('[data-slot="sidebar-gap"]') as HTMLElement;
        const pane = document.querySelector('[data-slot="sidebar-container"]') as HTMLElement;
        fireEvent.pointerDown(handle, { ...pointer, clientX: startX });
        fireEvent.pointerMove(handle, { ...pointer, clientX: endX });
        expect(dragWidth()).toBe(visualWidth);
        expect(sidebarWidth()).toBe("256px");
        expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state")).toBe(
          state,
        );
        fireEvent.pointerUp(handle, pointer);
        expect(dragWidth()).toBe("");
        expect(gap.style.width).toBe("");
        expect(pane.style.width).toBe("");
        expect(pane.style.left).toBe("");
        expect(sidebarWidth()).toBe("192px");
        expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state")).toBe(
          state,
        );
      },
    );

    it("updates live CSS and ARIA without React renders or context updates during ordinary moves", () => {
      stubDesktopViewport();
      const commits = vi.fn();
      const contextRenders = vi.fn();
      function WidthProbe() {
        const { sidebarWidth: storedWidth } = useSidebar();
        contextRenders(storedWidth);
        return <output data-testid="stored-width">{storedWidth}</output>;
      }
      render(
        <Profiler id="sidebar" onRender={commits}>
          <PrimitiveSidebarLayout>
            <WidthProbe />
          </PrimitiveSidebarLayout>
        </Profiler>,
      );
      const handle = screen.getByRole("separator", { name: "Resize sidebar" });
      Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
      const pointer = { pointerId: 1, isPrimary: true, button: 0 };
      fireEvent.pointerDown(handle, { ...pointer, clientX: 256 });
      commits.mockClear();
      contextRenders.mockClear();
      for (const clientX of [280, 300, 320]) {
        fireEvent.pointerMove(handle, { ...pointer, clientX });
      }
      expect(commits).not.toHaveBeenCalled();
      expect(contextRenders).not.toHaveBeenCalled();
      expect(dragWidth()).toBe("320px");
      expect(handle.getAttribute("aria-valuenow")).toBe("320");
      expect(handle.getAttribute("aria-valuetext")).toBe("320 pixels");
      expect(sidebarWidth()).toBe("256px");
      expect(screen.getByTestId("stored-width").textContent).toBe("256");
      fireEvent.pointerUp(handle, pointer);
      expect(contextRenders).toHaveBeenLastCalledWith(320);
      expect(commits).toHaveBeenCalledTimes(1);
      expect(sidebarWidth()).toBe("320px");
      expect(screen.getByTestId("stored-width").textContent).toBe("320");
      expect(dragWidth()).toBe("");
    });

    it("preserves live CSS and ARIA through an unrelated parent rerender", () => {
      stubDesktopViewport();
      const view = render(<PrimitiveSidebarLayout className="before" />);
      const handle = screen.getByRole("separator", { name: "Resize sidebar" });
      Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
      const pointer = { pointerId: 1, isPrimary: true, button: 0 };
      fireEvent.pointerDown(handle, { ...pointer, clientX: 256 });
      fireEvent.pointerMove(handle, { ...pointer, clientX: 300 });
      view.rerender(<PrimitiveSidebarLayout className="after" />);
      expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBe(handle);
      expect(handle.getAttribute("data-resizing")).toBe("true");
      expect(handle.getAttribute("aria-valuenow")).toBe("300");
      expect(handle.getAttribute("aria-valuetext")).toBe("300 pixels");
      expect(dragWidth()).toBe("300px");
      expect(sidebarWidth()).toBe("256px");
      fireEvent.pointerMove(handle, { ...pointer, clientX: 320 });
      expect(dragWidth()).toBe("320px");
      fireEvent.pointerUp(handle, pointer);
      expect(sidebarWidth()).toBe("320px");
      expect(dragWidth()).toBe("");
    });

    it("collapses when the keyboard reaches the minimum width", async () => {
      stubDesktopViewport();
      renderSidebarLayout({ resizable: true });
      const handle = await screen.findByRole("separator", { name: "Resize sidebar" });
      fireEvent.keyDown(handle, { key: "Home" });
      expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
      expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state")).toBe(
        "collapsed",
      );
    });

    it.each(["{Enter}", " "])("expands from the collapsed handle using %s", async (key) => {
      stubDesktopViewport();
      renderSidebarLayout({ resizable: true, defaultOpen: false });

      await waitFor(() => {
        expect(document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-state")).toBe(
          "collapsed",
        );
      });
      expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
      const handle = screen.getByRole("button", { name: "Expand sidebar" });
      expect(handle.getAttribute("aria-expanded")).toBe("false");
      handle.focus();
      await userEvent.setup().keyboard(key);
      expect(screen.getByRole("separator", { name: "Resize sidebar" })).toBeDefined();
      expect(sidebarWidth()).toBe("256px");
    });

    it.each([375, 1024])(
      "does not add resize handles to overlays or icon rails at %ipx",
      async (width) => {
        vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
        renderSidebarLayout({ resizable: true });
        const user = userEvent.setup();
        const trigger = await screen.findByRole("button", { name: "Toggle Sidebar" });
        expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();

        await user.click(trigger);
        await screen.findByRole("dialog");
        expect(screen.queryByRole("separator", { name: "Resize sidebar" })).toBeNull();
      },
    );

    it("still resizes when collapsing is disabled", async () => {
      stubDesktopViewport();
      renderSidebarLayout({ resizable: true, collapsible: false, defaultOpen: false });
      const handle = await screen.findByRole("separator", { name: "Resize sidebar" });

      expect(screen.queryByRole("button", { name: "Toggle Sidebar" })).toBeNull();
      fireEvent.keyDown(handle, { key: "ArrowRight" });
      expect(sidebarWidth()).toBe("272px");
      Object.defineProperty(handle, "setPointerCapture", { value: vi.fn() });
      const pointer = { pointerId: 1, isPrimary: true, button: 0 };
      fireEvent.pointerDown(handle, { ...pointer, clientX: 272 });
      fireEvent.pointerMove(handle, { ...pointer, clientX: 64 });
      expect(sidebarWidth()).toBe("272px");
      expect(dragWidth()).toBe("192px");
      expect(handle.getAttribute("aria-valuenow")).toBe("192");
      expect((document.querySelector('[data-slot="sidebar"]') as HTMLElement).style.width).toBe("");
      fireEvent.pointerUp(handle, pointer);
      expect(sidebarWidth()).toBe("192px");
      expect(dragWidth()).toBe("");
    });
  });

  describe("header slot", () => {
    it("renders the built-in DefaultHeader by default", async () => {
      renderSidebarLayout();

      await waitFor(() => {
        expect(document.querySelector("header")).not.toBeNull();
      });

      // Default right-hand cluster contains exactly the appearance switcher.
      const cluster = getHeaderRightCluster();
      expect(cluster).not.toBeNull();
      expect(cluster!.children.length).toBe(1);
      expect(cluster!.querySelector('[data-testid="bell"]')).toBeNull();
    });

    it("replaces the whole header when `header` is provided", async () => {
      renderSidebarLayout({ header: <div data-testid="custom-header">Custom</div> });

      await waitFor(() => {
        expect(document.querySelector('[data-testid="custom-header"]')).not.toBeNull();
      });

      // The built-in <header> element is not rendered when replaced.
      expect(document.querySelector("header")).toBeNull();
    });
  });

  describe("DefaultHeader actions", () => {
    const renderWithActions = (actions: React.ReactNode | React.ReactNode[]) =>
      renderSidebarLayout({ header: <DefaultHeader actions={actions} /> });

    it("defaults to the appearance switcher when actions is omitted", async () => {
      renderSidebarLayout({ header: <DefaultHeader /> });

      await waitFor(() => {
        expect(document.querySelector("header")).not.toBeNull();
      });

      const cluster = getHeaderRightCluster();
      expect(cluster!.children.length).toBe(1);
      expect(cluster!.querySelector('[data-testid="bell"]')).toBeNull();
    });

    it("replaces the right cluster with a single action node (no switcher)", async () => {
      renderWithActions(<button data-testid="bell">Bell</button>);

      await waitFor(() => {
        expect(document.querySelector('[data-testid="bell"]')).not.toBeNull();
      });

      const cluster = getHeaderRightCluster();
      // Only the bell — the default appearance switcher is replaced.
      expect(cluster!.children.length).toBe(1);
      expect(cluster!.firstElementChild).toBe(document.querySelector('[data-testid="bell"]'));
    });

    it("replaces the right cluster with an array of action nodes", async () => {
      renderWithActions([
        <button key="bell" data-testid="bell">
          Bell
        </button>,
        <button key="user" data-testid="user">
          User
        </button>,
      ]);

      await waitFor(() => {
        expect(document.querySelector('[data-testid="bell"]')).not.toBeNull();
      });

      const cluster = getHeaderRightCluster();
      expect(cluster!.children.length).toBe(2);
      expect(document.querySelector('[data-testid="user"]')).not.toBeNull();
    });

    it("keeps the appearance switcher when included in actions", async () => {
      renderWithActions([
        <button key="bell" data-testid="bell">
          Bell
        </button>,
        <AppearanceSwitcher key="appearance" />,
      ]);

      await waitFor(() => {
        expect(document.querySelector('[data-testid="bell"]')).not.toBeNull();
      });

      // Bell + switcher = two nodes in the cluster.
      const cluster = getHeaderRightCluster();
      expect(cluster!.children.length).toBe(2);
    });

    it("renders an empty right cluster when actions is []", async () => {
      renderWithActions([]);

      await waitFor(() => {
        expect(document.querySelector("header")).not.toBeNull();
      });

      const cluster = getHeaderRightCluster();
      expect(cluster!.children.length).toBe(0);
    });
  });

  describe("topBar slot", () => {
    it("renders the top bar and publishes its height to offset the sidebar", async () => {
      renderSidebarLayout({ topBar: <div data-testid="global-bar">Bar</div> });

      await waitFor(() => {
        expect(document.querySelector('[data-testid="global-bar"]')).not.toBeNull();
      });

      // The wrapper publishes --appshell-topbar-h so the fixed sidebar starts
      // beneath the bar.
      const wrapper = document.querySelector('[data-slot="sidebar-wrapper"]');
      expect(wrapper?.className).toContain("--appshell-topbar-h");
    });

    it("does not render a top bar or set its height by default (backward compatible)", async () => {
      renderSidebarLayout();

      await waitFor(() => {
        expect(document.querySelector('[data-slot="sidebar-wrapper"]')).not.toBeNull();
      });

      const wrapper = document.querySelector('[data-slot="sidebar-wrapper"]');
      expect(wrapper?.className).not.toContain("--appshell-topbar-h");
    });
  });

  describe("namespace", () => {
    it("exposes DefaultSidebar and DefaultHeader on SidebarLayout", () => {
      expect(SidebarLayout.DefaultSidebar).toBe(DefaultSidebar);
      expect(SidebarLayout.DefaultHeader).toBe(DefaultHeader);
    });
  });
});
