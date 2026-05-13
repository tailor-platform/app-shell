import { render, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { SidebarLayout } from "./sidebar-layout";
import { AppShell } from "@/components/appshell";
import { defineModule } from "@/resource";
import { Home } from "lucide-react";

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

const renderSidebarLayout = (
  props: Parameters<typeof SidebarLayout>[0] = {},
) => {
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
        const sidebar = document.querySelector('[data-slot="sidebar"]')!;
        expect(sidebar).toBeDefined();
      });

      const sidebar = document.querySelector('[data-slot="sidebar"]')!;
      // collapsible="none" renders a plain div without data-collapsible or data-state
      expect(sidebar.getAttribute("data-collapsible")).toBeNull();
      expect(sidebar.getAttribute("data-state")).toBeNull();
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
        const triggers = document.querySelectorAll(
          '[data-slot="sidebar-trigger"]',
        );
        expect(triggers.length).toBeGreaterThan(0);
      });
    });
  });
});
