import { render, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { SidebarLayout } from "./sidebar-layout";
import { DefaultHeader } from "./default-header";
import { DefaultSidebar } from "./default-sidebar";
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

/**
 * Stub window.innerWidth so useIsMobile() returns false (desktop mode).
 * This is needed because happy-dom defaults to innerWidth=0 which triggers mobile mode.
 */
const stubDesktopViewport = () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
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

  describe("namespace", () => {
    it("exposes DefaultSidebar and DefaultHeader on SidebarLayout", () => {
      expect(SidebarLayout.DefaultSidebar).toBe(DefaultSidebar);
      expect(SidebarLayout.DefaultHeader).toBe(DefaultHeader);
    });
  });
});
